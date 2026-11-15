import Substitution from '../../models/Substitution.js';
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
 * Accepte une demande de substitution ou un échange de vacations
 * @param {string} requestId
 * @param {string} userId
 * @param {Object} opts
 * @param {boolean} opts.isSwitch - true for shift swap, false for substitution
 */
export async function acceptRequest (requestId, userId, { isSwitch = false } = {}) {
    let request, acceptedShiftPoints;

    try {
        await inTransaction(async (session) => {
            ({ request, acceptedShiftPoints } =
                await acceptRequestWithSession(requestId, userId, { session, isSwitch }));
        });
    } catch (error) {
        if (error instanceof AppError) throw error;
        // Le détail reste dans les logs : le texte brut d'une erreur ne doit pas arriver au client
        console.error(`Erreur lors de l'acceptation de la ${isSwitch ? 'permutation' : 'demande'} :`, error);
        throw new AppError(`Erreur lors de l'acceptation de la ${isSwitch ? 'permutation' : 'demande'}`, 500);
    }

    // Post-transaction : vacation de l'accepteur ce jour-là, avec les entrées de calendrier qui viennent d'être validées
    // (la vacation du demandeur pour un remplacement, la sienne échangée pour une permutation)
    const accepterShift = (await computeUserShifts([posterDayOf(request)], userId))[0];

    // Post-transaction: populate for return value
    await request.populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'posterShift.teamId', select: 'name' },
        ...(isSwitch ? [
            { path: 'accepterShift.shift', populate: { path: 'variations' } },
            { path: 'accepterShift.selectedVariation' },
            { path: 'accepterShift.teamId', select: 'name' },
        ] : []),
    ]);

    const result = request.toObject();

    // Populate for email only
    await request.populate([
        { path: 'posterId', select: 'name lastName email' },
        { path: 'accepterId', select: 'name lastName email' },
    ]);

    sendAcceptedDemandEmail(request)
        .then(({ sent, failed }) =>
            console.log('📧 Notifications envoyées:', { requestId: request._id, sent, failed })
        )
        .catch((err) => console.error('❌ Erreur notification:', err));

    return isSwitch
        ? { request: result, acceptedShiftPoints, shift: accepterShift }
        : { request: result, shift: accepterShift };
}

export const acceptDemand = (requestId, userId) => acceptRequest(requestId, userId, { isSwitch: false });
export const swapShifts = async (requestId, userId) => {
    const res = await acceptRequest(requestId, userId, { isSwitch: true });
    return { demand: res.request, acceptedShiftPoints: res.acceptedShiftPoints, shift: res.shift };
};

/**
 * Accepte une demande de substitution ou un échange de vacations
 * @param {string} requestId
 * @param {string} userId
 * @param {Object} opts
 * @param {boolean} opts.isSwitch - true for shift swap, false for substitution
 */
export async function acceptRequestWithSession (requestId, userId, { session, isSwitch = false }) {
    // L'une après l'autre : opérations concurrentes sur une session de transaction non supportées (known issue #48)
    const request = await Substitution.findById(requestId).session(session);
    const user = isSwitch ? await User.findById(userId).session(session) : null;

    if (!request) throw new AppError('Demande non trouvée', 404);
    if (!user && isSwitch) throw new AppError('Utilisateur non trouvé', 404);
    if (request.status !== 'open') throw new AppError("Cette demande n'est plus disponible", 400);
    if (sameId(request.posterId, userId)) throw new AppError('Vous ne pouvez pas accepter votre propre demande', 400);

    const openDemands = await Substitution.find({
        posterId: userId,
        status: 'open',
        ...dayFilter('posterShift.day', 'posterShift.date', { eq: posterDayOf(request) })
    }).session(session);

    if (openDemands.length > 0) {
        throw new AppError('Vous avez déjà une demande ouverte ce jour', 400);
    }

    let acceptedShiftPoints = 0;

    // Switch-specific: validate accepter shift and points
    if (isSwitch) {
        const [accepterDay] = await computeUserShifts([posterDayOf(request)], userId);
        // Une vacation cédée reste affichée barrée : seule une vacation réellement travaillée peut être échangée
        const heldShift = accepterDay?.isWorked ? accepterDay.shiftData?.shift : null;
        if (!heldShift) throw new AppError("Vous n'avez pas de vacation à échanger ce jour-là", 400);

        const acceptedShiftData = request.acceptedSwitches.find(
            (s) => sameId(s.shift, heldShift._id)
        );
        if (!acceptedShiftData) throw new AppError("Votre vacation n'est pas acceptée pour cet échange", 400);

        acceptedShiftPoints = acceptedShiftData.points ?? 0;
        if (acceptedShiftPoints > 0 && user.points + acceptedShiftPoints > MAX_POINTS_TO_ACCEPT_REQUEST) {
            throw new AppError("Vous ne pouvez pas accepter cette demande, vous avez déjà assez de points", 400);
        }

        const heldTeam = accepterDay.shiftData.team;
        request.accepterShift = {
            shift: heldShift._id,
            teamId: heldTeam?._id ?? heldTeam,
            selectedVariation: null,
            date: request.posterShift.date,
            day: posterDayOf(request),   // même jour que celui du demandeur
        };
    }

    request.accepterId = userId;
    request.status = 'accepted';
    request.reminderSentAt = null;
    request.updatedAt = new Date();
    await request.save({ session });

    const points = isSwitch ? acceptedShiftPoints : request.points;
    if (points > 0) {
        await scheduledTransactionService.createScheduledTransaction({
            sender: request.posterId,
            receiver: userId,
            amount: points,
            type: 'replacement',
            request: requestId,
            description: `${isSwitch ? 'Permutation' : 'Remplacement'} du ${formatDateFr(posterDayOf(request), { short: true })}`,
            scheduledDate: new Date(posterDayOf(request))   // YYYY-MM-DD = minuit UTC
        }, { session });
    }

    // Les entrées de calendrier sont écrites dans la transaction ; la vacation de l'accepteur qui en résulte se calcule
    // après le commit (voir acceptRequest) : computeUserShifts ne lit pas dans la session
    await addSubstitutionEntries(request, { session });

    return { request, acceptedShiftPoints };
}
