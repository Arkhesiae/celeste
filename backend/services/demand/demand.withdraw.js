import User from '../../models/User.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import { inTransaction } from '../../utils/mongo.js';
import { computeUserShifts } from '../planning/planning.userShifts.js';
import { sendCancelledAcceptanceEmail } from '../email/demand/demand.emails.js';
import { categorizeDemands } from './demand.list.js';
import { AppError } from '../../error/AppError.js';
import { withdrawFromDemandWithSession } from './demand.cascade.js';


/**
 * Annule l'acceptation d'une demande
 * @param {string} demandId - ID de la demande
 * @param {string} userId - ID de l'utilisateur qui annule l'acceptation
 * @returns {Promise<Object>} Demande avec acceptation annulée
 */
export async function withdrawFromDemand (demandId, userId) {
    let updatedDemand, cancelledDemands;
    try {
        ({ updatedDemand, cancelledDemands } = await inTransaction((session) =>
            withdrawFromDemandWithSession(demandId, userId, { session })
        ));
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError("Erreur lors du désistement", 500);
    }

    const [shiftsResult, categorizedResult, accepterResult] = await Promise.allSettled([
        computeUserShifts([posterDayOf(updatedDemand)], userId),
        categorizeDemands([updatedDemand], userId),
        User.findById(userId).select('name lastName email'),
    ]);

    if (shiftsResult.status === 'rejected') {
        throw new AppError('Erreur lors du calcul du shift', 500);
    }

    if (accepterResult.status === 'rejected') {
        throw new AppError('Erreur lors de la récupération de l\'utilisateur', 500);
    }

    const shifts = shiftsResult.value;
    const originalAccepter = accepterResult.value;
    const categorizedDemands = categorizedResult.status === 'fulfilled'
        ? categorizedResult.value
        : [updatedDemand];


    console.log("Withdraw from demand", originalAccepter?.name, "  | cancelledDemands : ", cancelledDemands.length);

    await updatedDemand.populate([
        { path: 'posterId', select: 'name lastName email' },
    ]);

    sendCancelledAcceptanceEmail(updatedDemand, originalAccepter)
        .then(({ sent, failed }) =>
            console.log('📧 Notifications envoyées:', { demandId: updatedDemand._id, sent, failed })
        )
        .catch((err) => console.error('❌ Erreur notification:', err));

    return { shift: shifts[0], updatedDemand: categorizedDemands[0], cancelledDemands };
}
