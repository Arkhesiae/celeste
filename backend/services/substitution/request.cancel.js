import { computeUserShifts } from '../planning/planning.userShifts.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import Substitution from '../../models/Substitution.js';
import { findOrThrow, inTransaction } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { notifyDemandCancelledByUser } from '../email/demand/demand.changeNotifications.js';
import { CANCELLABLE_STATUSES, cancelRequestWithSession } from './request.cascade.js';


/**
 * Point d'entrée public — ouvre la transaction et orchestre l'annulation en cascade.
 * L'accepteur (et les personnes touchées par l'annulation en cascade) sont prévenus par email une fois la transaction validée.
 * @param {string} requestId
 * @param {{ actorId?: string }} [options] - `actorId` : utilisateur qui annule (il n'est pas notifié)
 * @returns {Promise<Object>}
 */
export async function cancelRequest (requestId, { actorId } = {}) {
    try {
        let cancelledRequests;
        await inTransaction(async (session) => {
            const request = await findOrThrow(Substitution, requestId, { message: 'Demande non trouvée', session });
            if (!CANCELLABLE_STATUSES.includes(request.status)) {
                throw new AppError("Cette demande n'est plus annulable", 400);
            }
            cancelledRequests = await cancelRequestWithSession(requestId, { session });
        });

        const initialCancel = cancelledRequests[cancelledRequests.length - 1];

        // Juste après le commit (un rollback n'envoie aucun email), avant tout calcul qui pourrait échouer : l'annulation
        // est faite, les personnes touchées doivent le savoir. Les erreurs d'envoi n'échouent pas l'annulation.
        notifyDemandCancelledByUser({
            demandId: initialCancel._id,
            cascadedIds: cancelledRequests.slice(0, -1).map((request) => request._id),
            actorId,
        });

        const shifts = await computeUserShifts([posterDayOf(initialCancel)], initialCancel.posterId);

        console.log("Demande annulée", "total cancelled : ", cancelledRequests.length)

        return { initialCancel, cancelledRequests, shift: shifts[0] };

    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError("Erreur lors de l'annulation de la demande", 500);
    }
}
