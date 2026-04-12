import User from '../../models/User.js';
import { computeShiftOfUserWithSubstitutions } from '../../utils/computeShiftOfUserWithSubstitutions.js';
import { sendCancelledAcceptanceEmail } from '../email/userPoolNotificationEmail.js';
import { categorizeRequests } from './request.getAndCat.js';
import { AppError } from '../../error/AppError.js';
import mongoose from 'mongoose';
import { withdrawFromRequestWithSession } from './request.internal.js';


/**
 * Annule l'acceptation d'une demande de substitution
 * @param {string} requestId - ID de la demande
 * @param {string} userId - ID de l'utilisateur qui annule l'acceptation
 * @returns {Promise<Object>} Demande avec acceptation annulée
 */
export async function withdrawFromRequest (requestId, userId) {
    const session = await mongoose.startSession();

    let updatedRequest, accepterShift, cancelledRequests = [];

    try {
        await session.withTransaction(async () => {
            ({ updatedRequest, accepterShift, cancelledRequests } = await withdrawFromRequestWithSession(
                requestId,
                userId,
                { visited: new Set(), session, cancelledRequests }
            ));
        });
    } catch (error) {
        console.error("❌ Erreur lors de l'annulation de l'acceptation:", error);
        if (error instanceof AppError) throw error;
        throw new AppError("Erreur lors de l'annulation de l'acceptation", 500);
    } finally {
        session.endSession();
    }


    console.log("Withdraw from demand | cancelledRequests : ", cancelledRequests.length);

    const [shiftsResult, categorizedResult, accepterResult] = await Promise.allSettled([
        computeShiftOfUserWithSubstitutions([updatedRequest.posterShift.date], userId),
        categorizeRequests([updatedRequest], userId),
        User.findById(userId).select('name lastName email'),
    ]);

    if (shiftsResult.status === 'rejected') {
        console.error('❌ Erreur calcul shift:', shiftsResult.reason);
        throw new AppError('Erreur lors du calcul du shift', 500);
    }

    if (accepterResult.status === 'rejected') {
        console.error('❌ Erreur récupération utilisateur:', accepterResult.reason);
        throw new AppError('Erreur lors de la récupération de l\'utilisateur', 500);
    }

    const shifts = shiftsResult.value;
    const originalAccepter = accepterResult.value;
    const categorizedRequests = categorizedResult.status === 'fulfilled'
        ? categorizedResult.value
        : [updatedRequest];
    
    
    console.log("Withdraw from demand", originalAccepter?.name, "  | cancelledRequests : ", cancelledRequests.length);
    
    await updatedRequest.populate([
        { path: 'posterId', select: 'name lastName email' },
    ]);

    sendCancelledAcceptanceEmail(updatedRequest, originalAccepter)
        .then(({ sent, failed }) =>
            console.log('📧 Notifications envoyées:', { demandId: updatedRequest._id, sent, failed })
        )
        .catch((err) => console.error('❌ Erreur notification:', err));

    return { shift: shifts[0], updatedRequest: categorizedRequests[0], cancelledRequests };
}
