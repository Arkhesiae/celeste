import Rotation from '../../models/Rotation.js';
import Shift from '../../models/Shift.js';
import { toPlainDate } from '../../utils/dates/plainDate.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import { AppError } from '../../error/AppError.js';
import { findLatestRotation } from './rotation.latest.js';

/**
 * Suppression (logique) d'un tour de service et de ses jours.
 * Refusée tant qu'il est le tour actif du centre ou qu'il lui reste des activations à venir.
 */
export async function deleteRotation (id) {
    const rotation = await findOrThrow(Rotation, id, { message: 'Rotation non trouvée.' });
    const currentDate = new Date();
    const lastActiveRotation = await findLatestRotation(rotation.centerId, currentDate);

    if (lastActiveRotation && sameId(lastActiveRotation._id, rotation._id)) {
        throw new AppError('Le tour de service ne peut pas être supprimé car il est actif.', 400, 'ActiveRotation');
    }

    const today = toPlainDate(currentDate).toString();
    const hasFutureActivations = activationDaysOf(rotation).some(day => day > today);

    if (hasFutureActivations) {
        throw new AppError('Le tour de service ne peut pas être supprimé car il reste des activations.', 400, 'RemainingOccurences');
    }

    for (const day of rotation.days) {
        const shift = await Shift.findById(day);
        if (shift) {
            shift.deleted = true;
            await shift.save();
        }
    }

    rotation.deleted = true;
    await rotation.save();
}
