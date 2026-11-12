import Rotation from '../../models/Rotation.js';
import { isValidId } from '../../utils/ids.js';
import { isValidDate } from '../../utils/validation.js';
import { AppError } from '../../error/AppError.js';
import rotationActivationService from './rotation.activation.js';

/**
 * Demande d'ajout ou de retrait d'une date d'activation : valide la demande, puis laisse `rotation.activation.js`
 * calculer l'aperçu (sans `confirmed`) ou appliquer le changement (avec `confirmed: true`).
 *
 * @param {'add'|'remove'} action
 * @param {string} id - tour de service
 * @param {string} activationDate - YYYY-MM-DD
 * @param {boolean} confirmed
 * @returns {Promise<{ message: string, changes?: Array, needsApproval?: boolean }>}
 */
export async function changeActivationDate (action, id, activationDate, confirmed) {
    if (!activationDate) {
        throw new AppError('Date d\'activation requise.', 400);
    }
    if (!isValidDate(activationDate)) {
        throw new AppError('Date invalide.', 400);
    }
    if (!isValidId(id)) {
        throw new AppError('ID de rotation invalide.', 400);
    }

    const rotation = await Rotation.findById(id);
    if (!rotation || rotation.deleted) {
        throw new AppError('Rotation non trouvée ou supprimée.', 404);
    }

    return rotationActivationService.updateActivationDate(action, id, activationDate, confirmed);
}
