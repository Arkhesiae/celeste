import { computeUserShifts } from '../planning/computeUserShifts.js';
import { inTransaction } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { cancelRequestWithSession } from './request.internal.js';


/**
 * Point d'entrée public — ouvre la transaction et orchestre l'annulation en cascade
 * @param {string} requestId
 * @returns {Promise<Object>}
 */
export async function cancelRequest (requestId) {
    try {
        let cancelledRequests;
        await inTransaction(async (session) => {
            cancelledRequests = await cancelRequestWithSession(requestId, { session });
        });

        const initialCancel = cancelledRequests[cancelledRequests.length - 1];
        const shifts = await computeUserShifts([initialCancel.posterShift.date], initialCancel.posterId);

        console.log("Demande annulée", "total cancelled : ", cancelledRequests.length)

        return { initialCancel, cancelledRequests, shift: shifts[0] };

    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError("Erreur lors de l'annulation de la demande", 500);
    }
}
