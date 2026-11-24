import Demand from '../../models/Demand.js';
import User from '../../models/User.js';
import { formatDateFr } from '../../utils/dates/format.js';
import { posterDayOf, dayFilter } from '../../utils/dates/dayAccess.js';
import { inTransaction } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import { AppError } from '../../error/AppError.js';
import { computeUserShifts } from '../planning/planning.userShifts.js';
import { sendAcceptedDemandEmail } from '../email/demand/demand.emails.js';
import { addSubstitutionEntries } from '../calendarEntry/calendarEntry.register.js';
import * as scheduledTransactionService from '../transaction/transaction.scheduled.js';
import { MAX_POINTS_TO_ACCEPT_REQUEST } from '../../config/points.js';

/**
 * Accepte une demande ou un échange de vacations
 * @param {string} demandId
 * @param {string} userId
 * @param {Object} opts
 * @param {boolean} opts.isSwitch - true for shift swap, false for substitution
 */
export async function acceptOrSwapDemand (demandId, userId, { isSwitch = false } = {}) {
    let demand, acceptedShiftPoints;

    try {
        await inTransaction(async (session) => {
            ({ demand, acceptedShiftPoints } =
                await acceptDemandWithSession(demandId, userId, { session, isSwitch }));
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        // Le détail reste dans les logs : le texte brut d'une erreur ne doit pas arriver au client
        console.error(`Erreur lors de l'acceptation de la ${isSwitch ? 'permutation' : 'demande'} :`, error);
        throw new AppError(`Erreur lors de l'acceptation de la ${isSwitch ? 'permutation' : 'demande'}`, 500);
    }

    // Post-transaction : vacation de l'accepteur ce jour-là, avec les entrées de calendrier qui viennent d'être validées
    // (la vacation du demandeur pour un remplacement, la sienne échangée pour une permutation)
    const accepterShift = (await computeUserShifts([posterDayOf(demand)], userId))[0];

    // Post-transaction: populate for return value
    await demand.populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'posterShift.teamId', select: 'name' },
        ...(isSwitch ? [
            { path: 'accepterShift.shift', populate: { path: 'variations' } },
            { path: 'accepterShift.selectedVariation' },
            { path: 'accepterShift.teamId', select: 'name' },
        ] : []),
    ]);

    const result = demand.toObject();

    // Populate for email only
    await demand.populate([
        { path: 'posterId', select: 'name lastName email' },
        { path: 'accepterId', select: 'name lastName email personalData.phoneNumber' },
    ]);

    sendAcceptedDemandEmail(demand)
        .then(({ sent, failed }) =>
            console.log('📧 Notifications envoyées:', { demandId: demand._id, sent, failed })
        )
        .catch((err) => console.error('❌ Erreur notification:', err));

    return isSwitch
        ? { demand: result, acceptedShiftPoints, shift: accepterShift }
        : { demand: result, shift: accepterShift };
}

export const acceptDemand = (demandId, userId) => acceptOrSwapDemand(demandId, userId, { isSwitch: false });
export const swapShifts = async (demandId, userId) => {
    const res = await acceptOrSwapDemand(demandId, userId, { isSwitch: true });
    return { demand: res.demand, acceptedShiftPoints: res.acceptedShiftPoints, shift: res.shift };
};

/**
 * Accepte une demande ou un échange de vacations
 * @param {string} demandId
 * @param {string} userId
 * @param {Object} opts
 * @param {boolean} opts.isSwitch - true for shift swap, false for substitution
 */
export async function acceptDemandWithSession (demandId, userId, { session, isSwitch = false }) {
    // L'une après l'autre : opérations concurrentes sur une session de transaction non supportées (known issue #48)
    const demand = await Demand.findById(demandId).session(session);
    const user = isSwitch ? await User.findById(userId).session(session) : null;

    if (!demand) throw new AppError('Demande non trouvée', 404);
    if (!user && isSwitch) throw new AppError('Utilisateur non trouvé', 404);
    if (demand.status !== 'open') throw new AppError("Cette demande n'est plus disponible", 400);
    if (sameId(demand.posterId, userId)) throw new AppError('Vous ne pouvez pas accepter votre propre demande', 400);

    const openDemands = await Demand.find({
        posterId: userId,
        status: 'open',
        ...dayFilter('posterShift.day', 'posterShift.date', { eq: posterDayOf(demand) })
    }).session(session);

    if (openDemands.length > 0) {
        throw new AppError('Vous avez déjà une demande ouverte ce jour', 400);
    }

    let acceptedShiftPoints = 0;

    // Switch-specific: validate accepter shift and points
    if (isSwitch) {
        const [accepterDay] = await computeUserShifts([posterDayOf(demand)], userId);
        // Une vacation cédée reste affichée barrée : seule une vacation réellement travaillée peut être échangée
        const heldShift = accepterDay?.isWorked ? accepterDay.shiftData?.shift : null;
        if (!heldShift) throw new AppError("Vous n'avez pas de vacation à échanger ce jour-là", 400);

        const acceptedShiftData = demand.acceptedSwitches.find(
            (s) => sameId(s.shift, heldShift._id)
        );
        if (!acceptedShiftData) throw new AppError("Votre vacation n'est pas acceptée pour cet échange", 400);

        acceptedShiftPoints = acceptedShiftData.points ?? 0;
        if (acceptedShiftPoints > 0 && user.points + acceptedShiftPoints > MAX_POINTS_TO_ACCEPT_REQUEST) {
            throw new AppError("Vous ne pouvez pas accepter cette demande, vous avez déjà assez de points", 400);
        }

        const heldTeam = accepterDay.shiftData.team;
        demand.accepterShift = {
            shift: heldShift._id,
            teamId: heldTeam?._id ?? heldTeam,
            selectedVariation: null,
            date: demand.posterShift.date,
            day: posterDayOf(demand),   // même jour que celui du demandeur
        };
    }

    demand.accepterId = userId;
    demand.status = 'accepted';
    demand.reminderSentAt = null;
    demand.updatedAt = new Date();
    await demand.save({ session });

    const points = isSwitch ? acceptedShiftPoints : demand.points;
    if (points > 0) {
        await scheduledTransactionService.createScheduledTransaction({
            sender: demand.posterId,
            receiver: userId,
            amount: points,
            type: 'replacement',
            request: demandId,
            description: `${isSwitch ? 'Permutation' : 'Remplacement'} du ${formatDateFr(posterDayOf(demand), { short: true })}`,
            scheduledDate: new Date(posterDayOf(demand))   // YYYY-MM-DD = minuit UTC
        }, { session });
    }

    // Les entrées de calendrier sont écrites dans la transaction ; la vacation de l'accepteur qui en résulte se calcule
    // après le commit (voir acceptOrSwapDemand) : computeUserShifts ne lit pas dans la session
    await addSubstitutionEntries(demand, { session });

    return { demand, acceptedShiftPoints };
}
