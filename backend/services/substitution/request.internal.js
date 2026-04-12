import Substitution from '../../models/Substitution.js';
import { AppError } from '../../error/AppError.js';
import { cancelPendingTransactions } from './request.mutations.utils.js';
import { computeShiftOfUserWithSubstitutions } from '../../utils/computeShiftOfUserWithSubstitutions.js';
import * as calendarEntryService from '../calendarEntry/calendar-entry.js';
import * as scheduledTransactionService from '../transaction/scheduledTransactionService.js';


/**
 * Point d'entrée privé — annule l'acceptation d'une demande de substitution
 * @param {string} requestId
 * @returns {Promise<Object>}
 */
export async function withdrawFromRequestWithSession (requestId, userId, { visited, session, cancelledRequests = [] }) {
    if (visited.has(requestId.toString())) return;
    visited.add(requestId.toString());

    const request = await Substitution.findOne(
        { _id: requestId, accepterId: userId, status: 'accepted' }
    )
        .session(session)
        .populate([
            { path: 'posterShift.shift', populate: { path: 'variations' } },
            { path: 'posterShift.selectedVariation' },
            { path: 'posterShift.teamId', select: 'name' },
        ]);

    if (!request) {
        throw new AppError('Demande non trouvée ou non modifiable', 404);
    }

    // Cascade-cancel child demands within the same transaction
    const childRequests = await Substitution.find({ dependsOn: requestId }).session(session);
    await Promise.all(
        childRequests.map((child) =>
            cancelRequestWithSession(child._id, { visited, session, cancelledRequests })
        )
    );

    // Reset demand to open
    request.status = 'open';
    request.accepterShift = undefined;
    request.accepterId = undefined;
    await request.save({ session });

    // Cancel transactions and calendar entries
    await cancelPendingTransactions(requestId, { session });
    const { accepterShift } = await calendarEntryService.cancelSubstitutionEntries(
        requestId,
        { posterId: request.posterId, accepterId: userId, date: request.posterShift.date },
        { session }
    );

    return { updatedRequest: request, accepterShift, cancelledRequests };
}


/**
 * Annule une demande de substitution (récursif, réutilise la session si fournie)
 * @param {string} requestId
 * @param {Object} opts
 * @param {Set} opts.visited
 * @param {ClientSession} [opts.session] - session Mongoose existante (appels récursifs)
 */
export async function cancelRequestWithSession (requestId, { visited, session, cancelledRequests = [] }) {
    if (visited.has(requestId.toString())) return;
    visited.add(requestId.toString());

    const request = await Substitution.findById(requestId).session(session);
    if (!request) throw new AppError('Demande non trouvée', 404);

    const childRequests = await Substitution.find({ dependsOn: requestId }).session(session);
    await Promise.all(
        childRequests.map((child) =>
            cancelRequestWithSession(child._id, { visited, session, cancelledRequests })
        )
    );

    await cancelPendingTransactions(requestId, { session });

    if (request.status === 'accepted') {
        await calendarEntryService.cancelSubstitutionEntries(
            requestId,
            { posterId: request.posterId, accepterId: request.accepterId, date: request.posterShift.date },
            { session }
        );
    }

    request.status = 'cancelled';
    await request.save({ session });

    cancelledRequests.push(request);

    return cancelledRequests;
}



// Note: Ensure this constant is available if it was globally defined, otherwise provide fallback:
const MAX_POINTS_TO_ACCEPT_REQUEST = 99999;

/**
 * Accepte une demande de substitution ou un échange de vacations
 * @param {string} requestId
 * @param {string} userId
 * @param {Object} opts
 * @param {boolean} opts.isSwitch - true for shift swap, false for substitution
 */
export async function acceptRequestWithSession (requestId, userId, { session, isSwitch = false }) {
    const [request, user] = await Promise.all([
        Substitution.findById(requestId).session(session),
        isSwitch ? User.findById(userId).session(session) : Promise.resolve(null),
    ]);

    if (!request) throw new AppError('Demande non trouvée', 404);
    if (!user && isSwitch) throw new AppError('Utilisateur non trouvé', 404);
    if (request.status !== 'open') throw new AppError("Cette demande n'est plus disponible", 400);
    if (request.posterId.toString() === userId) throw new AppError('Vous ne pouvez pas accepter votre propre demande', 400);

    const openDemands = await Substitution.find({
        posterId: userId,
        status: 'open',
        'posterShift.date': request.posterShift.date
    }).session(session);

    if (openDemands.length > 0) {
        throw new AppError('Vous avez déjà une demande ouverte ce jour', 400);
    }

    let acceptedShiftPoints = 0;
    let userShiftData = null;

    // Switch-specific: validate accepter shift and points
    if (isSwitch) {
        const userShifts = await computeShiftOfUserWithSubstitutions(new Date(request.posterShift.date), userId);
        if (!userShifts?.length) throw new AppError('Vacation utilisateur non trouvée', 404);

        userShiftData = userShifts[0];
        const acceptedShiftData = request.acceptedSwitches.find(
            (s) => s.shift.toString() === userShiftData.shift._id.toString()
        );
        if (!acceptedShiftData) throw new AppError("Votre vacation n'est pas acceptée pour cet échange", 400);

        acceptedShiftPoints = acceptedShiftData.points ?? 0;
        if (acceptedShiftPoints > 0 && user.points + acceptedShiftPoints > MAX_POINTS_TO_ACCEPT_REQUEST) {
            throw new AppError("Vous ne pouvez pas accepter cette demande, vous avez déjà assez de points", 400);
        }

        request.accepterShift = {
            shift: userShiftData.shift._id,
            teamId: userShiftData.teamObject._id,
            selectedVariation: null,
        };
    }

    request.accepterId = userId;
    request.status = 'accepted';
    request.updatedAt = new Date();
    await request.save({ session });

    const points = isSwitch ? acceptedShiftPoints : request.points;
    if (points > 0) {
        await scheduledTransactionService.createDelayedTransaction({
            sender: request.posterId,
            receiver: userId,
            amount: points,
            type: 'replacement',
            request: requestId,
            description: `${isSwitch ? 'Permutation' : 'Remplacement'} du ${new Date(request.posterShift.date).toLocaleDateString('fr-FR')}`,
            scheduledDate: new Date(request.posterShift.date)
        }, { session });
    }

    // Only substitution creates calendar entries inside the transaction
    const { accepterShift } = await calendarEntryService.addSubstitutionEntries(request, { session })

    return { request, accepterShift, acceptedShiftPoints, userShiftData };
}

/**
 * Archive les demandes de substitution ouvertes dont les dates sont passées
 * @returns {Promise<number>} Nombre de demandes archivées
 */
export const processPastDemands = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Trouve toutes les demandes ouvertes avec des dates passées (excluant aujourd'hui)
    const pastDemands = await Substitution.find({
        status: 'open',
        'posterShift.date': { $lt: startOfToday },
        deleted: false
    });

    // Archive les demandes trouvées
    const updatePromises = pastDemands.map(demand =>
        Substitution.findByIdAndUpdate(
            demand._id,
            {
                $set: {
                    deleted: true,
                    status: 'expired',
                    updatedAt: now
                }
            }
        )
    );

    await Promise.all(updatePromises);
    return pastDemands.length;
};

export const processAndCompleteDemands = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const completedDemands = await Substitution.find({
        status: 'accepted',
        'posterShift.date': { $lt: startOfToday },
        deleted: false
    });

    const updatePromises = completedDemands.map(demand =>
        Substitution.findByIdAndUpdate(
            demand._id,
            { $set: { deleted: true, status: 'completed', updatedAt: now } }
        )
    );
    await Promise.all(updatePromises);
    return completedDemands.length;
};

