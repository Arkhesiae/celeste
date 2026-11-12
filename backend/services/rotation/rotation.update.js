import Rotation from '../../models/Rotation.js';
import Shift from '../../models/Shift.js';
import Variation from '../../models/Variation.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { computeWorkDuration, registerVariation } from './rotation.create.js';

/**
 * Modification d'un tour de service : son nom, et un de ses jours (vacation et variantes).
 */

const POPULATE_DAYS_AND_VARIATIONS = { path: 'days', populate: { path: 'variations' } };

/**
 * Renomme un tour de service. `centerId` et les dates d'activation ne sont volontairement pas modifiables ici :
 * changer de centre ou d'activation passe par les routes d'activation (aperçu, approbation, conversion des demandes).
 * @returns {Promise<Object>} le tour de service, jours et variantes compris
 */
export async function renameRotation (id, updatedData) {
    const rotation = await findOrThrow(Rotation, id, { message: 'Tour de service non trouvé', populate: 'days' });

    if (updatedData.name) {
        rotation.name = updatedData.name;
    }

    const updatedRotation = await rotation.save();
    return Rotation.findById(updatedRotation._id).populate(POPULATE_DAYS_AND_VARIATIONS);
}

/**
 * Modifie un jour d'un tour de service. Un jour n'est modifiable que tant que le tour n'a jamais été (ni ne sera)
 * activé : sinon la modification changerait rétroactivement le planning et les demandes déjà passées ou à venir.
 * @returns {Promise<Object>} le tour de service, jours et variantes compris
 */
export async function updateDayInRotation (id, updatedDay) {
    const rotation = await findOrThrow(Rotation, id, { message: 'Tour de service non trouvé' });
    if (activationDaysOf(rotation).length > 0) {
        throw new AppError("Ce tour de service a des dates d'activation (passées ou à venir) : ses jours ne sont plus modifiables. Supprimez ses dates d'activation ou dupliquez-le pour le modifier.", 400, 'ROTATION_HAS_ACTIVATIONS');
    }

    const shift = await Shift.findById(updatedDay._id);
    if (!shift) {
        throw new AppError('Jour non trouvé', 400);
    }

    const isDayInRotation = rotation.days.some(day => day._id.equals(shift._id));
    if (!isDayInRotation) {
        throw new AppError('Jour non trouvé dans la rotation', 400);
    }

    if (updatedDay.type !== 'rest') {
        if (!updatedDay.default.startTime || !updatedDay.default.endTime) {
            throw new AppError('Le jour de travail doit avoir un début et une fin', 400);
        }
        const { points } = computeWorkDuration(updatedDay.default.startTime, updatedDay.default.endTime);

        shift.default = updatedDay.default;
        shift.default.points = points;
        shift.type = updatedDay.type;
        shift.optional = updatedDay.optional;
        shift.name = updatedDay.name;
        shift.order = updatedDay.order;

        shift.variations = [];

        const newVariationList = [];
        if (updatedDay.variations && updatedDay.variations.length > 0) {
            for (const updatedVariation of updatedDay.variations) {
                const variation = await Variation.findById(updatedVariation._id);
                if (variation) {
                    if (!updatedVariation.startTime || !updatedVariation.endTime) {
                        throw new AppError('Les variantes doivent avoir un début et une fin', 400);
                    }
                    const { points } = computeWorkDuration(updatedVariation.startTime, updatedVariation.endTime);

                    variation.name = updatedVariation.name;
                    variation.startTime = updatedVariation.startTime;
                    variation.endTime = updatedVariation.endTime;
                    variation.endsNextDay = updatedVariation.endsNextDay;
                    variation.points = points;

                    shift.variations.push(variation._id);
                    newVariationList.push(variation);
                    await variation.save();
                } else {
                    const newVariation = await registerVariation(updatedVariation, shift);
                    shift.variations.push(newVariation._id);
                    await newVariation.save();
                }
            }

            await Variation.deleteMany({ _id: { $nin: newVariationList.map(v => v._id), $in: shift.variations } });
        }
        await shift.save();
    }

    return rotation.populate(POPULATE_DAYS_AND_VARIATIONS);
}
