import Substitution from '../../models/Substitution.js';
import { formatDateFr } from '../../utils/dates/format.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { posterDayOf, dayFilter } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import User from '../../models/User.js';
import { AppError } from '../../error/AppError.js';
import { cancelPendingTransactions } from './request.mutations.utils.js';
import { computeUserShifts } from '../planning/computeUserShifts.js';
import * as calendarEntryService from '../calendarEntry/calendar-entry.js';
import * as scheduledTransactionService from '../transaction/transaction.scheduled.js';


import { MAX_POINTS_TO_ACCEPT_REQUEST } from '../../config/points.js';
/**
 * Point d'entrée privé — annule l'acceptation d'une demande de substitution
 * @param {string} requestId
 * @returns {Promise<Object>}
 */
export async function withdrawFromRequestWithSession (requestId, userId, { visited = new Set(), session, cancelledRequests = [] }) {
    const key = requestId.toString();
    if (visited.has(key)) return { updatedRequest: null, accepterShift: null, cancelledRequests };
    visited.add(key);

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
    await cancelCascade(requestId, { session, visited, cancelledRequests });

    // Reset demand to open
    request.status = 'open';
    request.accepterShift = undefined;
    request.accepterId = undefined;
    await request.save({ session });

    // Cancel transactions and calendar entries
    await cancelPendingTransactions(requestId, { session });
    const { accepterShift } = await calendarEntryService.cancelSubstitutionEntries(
        requestId,
        { posterId: request.posterId, accepterId: userId, date: posterDayOf(request) },
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
export async function cancelRequestWithSession (requestId, { visited = new Set(), session, cancelledRequests = [], reason }) {
    const key = requestId.toString();
    if (visited.has(key)) return cancelledRequests;
    visited.add(key);

    const request = await findOrThrow(Substitution, requestId, { message: 'Demande non trouvée', session });
    await cancelCascade(requestId, { session, visited, cancelledRequests });

    if (request.status === 'accepted') {
        await cancelPendingTransactions(requestId, { session });
        await calendarEntryService.cancelSubstitutionEntries(
            requestId,
            { posterId: request.posterId, accepterId: request.accepterId, date: posterDayOf(request) },
            { session }
        );
    }

    request.status = reason || 'cancelled';
    await request.save({ session });

    cancelledRequests.push(request);

    return cancelledRequests;
}


async function cancelCascade (parentId, { session, visited, cancelledRequests }) {
    const childRequests = await Substitution.find({ dependsOn: parentId }).session(session);
    for (const child of childRequests) {
        await cancelRequestWithSession(child._id, { visited, session, cancelledRequests });
    }
}


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
    let userShiftData = null;

    // Switch-specific: validate accepter shift and points
    if (isSwitch) {
        const userShifts = await computeUserShifts(posterDayOf(request), userId);
        if (!userShifts?.length) throw new AppError('Vacation utilisateur non trouvée', 404);

        userShiftData = userShifts[0];
        const acceptedShiftData = request.acceptedSwitches.find(
            (s) => sameId(s.shift, userShiftData.shift._id)
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
    request.reminderSentAt = null;
    request.updatedAt = new Date();
    await request.save({ session });

    const points = isSwitch ? acceptedShiftPoints : request.points;
    if (points > 0) {
        await scheduledTransactionService.createScheduledTransation({
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
    await calendarEntryService.addSubstitutionEntries(request, { session });

    return { request, acceptedShiftPoints, userShiftData };
}

/**
 * Archive les demandes de substitution ouvertes dont les dates sont passées
 * @returns {Promise<number>} Nombre de demandes archivées
 */
export const processPastDemands = async () => {
    const now = new Date();
    const today = todayIn().toString();

    // Trouve toutes les demandes ouvertes avec des dates passées (excluant aujourd'hui)
    const pastDemands = await Substitution.find({
        status: 'open',
        ...dayFilter('posterShift.day', 'posterShift.date', { lt: today }),
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
    const today = todayIn().toString();
    const completedDemands = await Substitution.find({
        status: 'accepted',
        ...dayFilter('posterShift.day', 'posterShift.date', { lt: today }),
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

