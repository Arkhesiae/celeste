/**
 * Annulation et désistement d'une demande, avec leurs effets en cascade (demandes qui en dépendent), dans la
 * transaction de l'appelant.
 */
import Demand from '../../models/Demand.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { cancelDemandTransactions } from './demand.pendingTransactions.js';
import { cancelSubstitutionEntries } from '../calendarEntry/calendarEntry.cancel.js';

/**
 * Point d'entrée privé — annule l'acceptation d'une demande
 * @param {string} demandId
 * @returns {Promise<Object>}
 */
export async function withdrawFromDemandWithSession(demandId, userId, { visited = new Set(), session, cancelledDemands = [] }) {
    const key = demandId.toString();
    if (visited.has(key)) return { updatedDemand: null, accepterShift: null, cancelledDemands };
    visited.add(key);

    const demand = await Demand.findOne(
        { _id: demandId, accepterId: userId, status: 'accepted' }
    )
        .session(session)
        .populate([
            { path: 'posterShift.shift', populate: { path: 'variations' } },
            { path: 'posterShift.selectedVariation' },
            { path: 'posterShift.teamId', select: 'name' },
        ]);

    if (!demand) {
        throw new AppError('Demande non trouvée ou non modifiable', 404);
    }

    // Cascade-cancel child demands within the same transaction
    await cancelCascade(demandId, { session, visited, cancelledDemands });

    // Reset demand to open
    demand.status = 'open';
    demand.accepterShift = undefined;
    demand.accepterId = undefined;
    await demand.save({ session });

    // Cancel transactions and calendar entries
    await cancelDemandTransactions(demandId, { session });
    const { accepterShift } = await cancelSubstitutionEntries(
        demandId,
        { posterId: demand.posterId, accepterId: userId, date: posterDayOf(demand) },
        { session }
    );

    return { updatedDemand: demand, accepterShift, cancelledDemands };
}


/** Seules ces demandes peuvent être annulées : une demande terminée, expirée ou déjà annulée ne change plus d'état */
export const CANCELLABLE_STATUSES = ['open', 'accepted'];

/**
 * Annule une demande (récursif, réutilise la session si fournie).
 * Une demande qui n'est plus annulable (terminée, expirée, déjà annulée) est laissée telle quelle, ce qui épargne les
 * demandes déjà finies d'une cascade ; un appelant qui doit la refuser contrôle `CANCELLABLE_STATUSES` avant (voir `cancelDemand`).
 * @param {string} demandId
 * @param {Object} opts
 * @param {Set} opts.visited
 * @param {ClientSession} [opts.session] - session Mongoose existante (appels récursifs)
 */
export async function cancelDemandWithSession(demandId, { visited = new Set(), session, cancelledDemands = [], reason }) {
    const key = demandId.toString();
    if (visited.has(key)) return cancelledDemands;
    visited.add(key);

    const demand = await findOrThrow(Demand, demandId, { message: 'Demande non trouvée', session });
    if (!CANCELLABLE_STATUSES.includes(demand.status)) return cancelledDemands;

    await cancelCascade(demandId, { session, visited, cancelledDemands });

    if (demand.status === 'accepted') {
        await cancelDemandTransactions(demandId, { session });
        await cancelSubstitutionEntries(
            demandId,
            { posterId: demand.posterId, accepterId: demand.accepterId, date: posterDayOf(demand) },
            { session }
        );
    }

    demand.status = reason || 'cancelled';
    await demand.save({ session });

    cancelledDemands.push(demand);

    return cancelledDemands;
}


async function cancelCascade(parentId, { session, visited, cancelledDemands }) {
    const childDemands = await Demand.find({ dependsOn: parentId }).session(session);
    for (const child of childDemands) {
        await cancelDemandWithSession(child._id, { visited, session, cancelledDemands });
    }
}
