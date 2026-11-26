import mongoose from 'mongoose';
import Rotation from '../../models/Rotation.js';
import Demand from '../../models/Demand.js';
import { CalendarEntry } from '../../models/CalendarEntry.js';
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
 * Supprime les variantes retirées d'un jour, sauf celles qu'une demande ou une entrée de calendrier désigne encore (le tour a pu
 * être activé puis désactivé : ces références doivent rester lisibles).
 */
async function deleteUnusedVariations (variationIds) {
    for (const id of variationIds.map((variationId) => new mongoose.Types.ObjectId(variationId))) {
        const used = await Demand.exists({ $or: [{ 'posterShift.selectedVariation': id }, { 'accepterShift.selectedVariation': id }] })
            || await CalendarEntry.exists({ $or: [{ 'shiftData.selectedVariation': id }, { 'substitution.gave.selectedVariation': id }] });
        if (!used) await Variation.deleteOne({ _id: id });
    }
}

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
 * Modifie un jour d'un tour de service. Libre tant que le tour n'a jamais été activé. S'il a des dates d'activation (passées ou à
 * venir), la modification réécrit les plannings, passés compris, et change les horaires des demandes existantes (ni contrôle de
 * compatibilité ni mail) : sans `confirmed`, rien n'est écrit et la réponse demande une confirmation (409 par le contrôleur).
 * La possibilité de confirmer est provisoire : la retirer revient à refuser dès qu'il y a une activation.
 * @returns {Promise<Object>} le tour de service, jours et variantes compris, ou `{ needsApproval: true, message }`
 */
export async function updateDayInRotation (id, updatedDay, { confirmed = false } = {}) {
    const rotation = await findOrThrow(Rotation, id, { message: 'Tour de service non trouvé' });
    if (rotation.deleted) {
        throw new AppError('Tour de service non trouvé', 404);
    }
    if (!confirmed && activationDaysOf(rotation).length > 0) {
        return {
            needsApproval: true,
            message: "Ce tour de service a déjà une date d'activation. Modifier ce jour changera aussi les plannings passés et les horaires des demandes existantes, sans vérifier leur compatibilité ni prévenir les agents.",
        };
    }

    const shift = await Shift.findById(updatedDay._id);
    if (!shift) {
        throw new AppError('Jour non trouvé', 400);
    }

    const isDayInRotation = rotation.days.some(day => day._id.equals(shift._id));
    if (!isDayInRotation) {
        throw new AppError('Jour non trouvé dans la rotation', 400);
    }

    const isRest = updatedDay.type === 'rest';
    // Un jour de repos n'a ni horaires ni variantes
    const updatedVariations = isRest ? [] : updatedDay.variations ?? [];

    // Tout se vérifie avant la première écriture : une variante invalide ne laisse pas les précédentes déjà modifiées
    if (!isRest && (!updatedDay.default?.startTime || !updatedDay.default?.endTime)) {
        throw new AppError('Le jour de travail doit avoir un début et une fin', 400);
    }
    if (updatedVariations.some((variation) => !variation.startTime || !variation.endTime)) {
        throw new AppError('Les variantes doivent avoir un début et une fin', 400);
    }

    shift.default = isRest
        ? { startTime: null, endTime: null, points: 0, endsNextDay: false }
        : { ...updatedDay.default, points: computeWorkDuration(updatedDay.default.startTime, updatedDay.default.endTime).points };
    shift.type = updatedDay.type;
    shift.optional = isRest ? false : updatedDay.optional;
    shift.name = updatedDay.name;
    shift.order = updatedDay.order;

    // Les variantes que le jour avait avant : les seules qu'une modification peut réécrire (un autre identifiant en crée une nouvelle,
    // il ne touche pas la variante d'un autre jour ou d'un autre centre)
    const previousIds = shift.variations.map((variationId) => variationId.toString());
    shift.variations = [];

    for (const updatedVariation of updatedVariations) {
        const isOwn = previousIds.includes(String(updatedVariation._id));
        const variation = isOwn ? await Variation.findById(updatedVariation._id) : null;
        if (variation) {
            variation.name = updatedVariation.name;
            variation.startTime = updatedVariation.startTime;
            variation.endTime = updatedVariation.endTime;
            variation.endsNextDay = updatedVariation.endsNextDay;
            variation.points = computeWorkDuration(updatedVariation.startTime, updatedVariation.endTime).points;
            await variation.save();
            shift.variations.push(variation._id);
        } else {
            const newVariation = await registerVariation(updatedVariation, shift);
            shift.variations.push(newVariation._id);
        }
    }

    await shift.save();

    const keptIds = new Set(shift.variations.map((variationId) => variationId.toString()));
    await deleteUnusedVariations(previousIds.filter((variationId) => !keptIds.has(variationId)));

    return rotation.populate(POPULATE_DAYS_AND_VARIATIONS);
}
