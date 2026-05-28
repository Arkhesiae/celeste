import Substitution from '../../models/Substitution.js';
import { AppError } from '../../error/appError.js';
import { cancelPendingTransactions } from './request.mutations.utils.js';


// ---------------------------- WIP ----------------------------
// ❌ Ce code n'est pas encore opérationnel ❌



/**
 * Supprime définitivement une demande de substitution
 * @param {string} demandId - ID de la demande à supprimer
 * @returns {Promise<Object>} Demande supprimée
 */
export async function deleteDemand (demandId) {
    const demand = await Substitution.findByIdAndUpdate(demandId, { deleted: true }, { new: true });

    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }

    await cancelPendingTransactions(demandId);

    return demand;
}
