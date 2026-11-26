import Rotation from '../../models/Rotation.js';
import Shift from '../../models/Shift.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import { AppError } from '../../error/AppError.js';
import { findLatestRotation } from './rotation.latest.js';
import { getCenterTimeZone } from '../center/center.timezone.js';

/**
 * Suppression (logique) d'un tour de service et de ses jours.
 * Refusée tant qu'il est actif ou qu'il lui reste des activations à venir (« aujourd'hui » est le jour du centre). Ses activations
 * passées restent : un tour supprimé n'est plus proposé, mais le planning et la chronologie continuent de le lire pour le passé.
 */
export async function deleteRotation (id) {
    const rotation = await findOrThrow(Rotation, id, { message: 'Rotation non trouvée.' });
    const today = todayIn(await getCenterTimeZone(rotation.centerId)).toString();
    const activationDays = activationDaysOf(rotation);

    const activeRotation = await findLatestRotation(rotation.centerId, today);
    if (activeRotation && sameId(activeRotation._id, rotation._id)) {
        throw new AppError('Le tour de service ne peut pas être supprimé car il est actif.', 400, 'ActiveRotation');
    }

    if (activationDays.some(day => day > today)) {
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
