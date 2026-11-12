/**
 * Annulation et désistement d'une demande, avec leurs effets en cascade (demandes qui en dépendent), dans la
 * transaction de l'appelant.
 */
import Substitution from '../../models/Substitution.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { cancelPendingTransactions } from './request.pendingTransactions.js';
import * as calendarEntryService from '../calendarEntry/index.js';

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
