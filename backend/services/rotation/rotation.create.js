import Rotation from '../../models/Rotation.js';
import Shift from '../../models/Shift.js';
import Variation from '../../models/Variation.js';
import { AppError } from '../../error/AppError.js';
import { SHIFT_POINTS_PER_HOUR, SHIFT_BASE_POINTS } from '../../config/points.js';

/**
 * Création d'un tour de service (rotation) : ses jours (shifts), leurs variantes, et la copie d'un tour existant.
 */

/** Durée d'une vacation (`HH:mm` → `HH:mm`) : heures, points, et si elle finit le lendemain */
export const computeWorkDuration = (start, end) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    let endsNextDay = false;
    let startDate = new Date();
    startDate.setHours(startHour, startMinute);
    let endDate = new Date();
    endDate.setHours(endHour, endMinute);

    if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
        endsNextDay = true;
    }
    const durationInMillis = endDate - startDate;
    const hours = Math.floor(durationInMillis / 3600000);
    const points = Math.floor(hours * SHIFT_POINTS_PER_HOUR) + SHIFT_BASE_POINTS;
    return { points: 10, duration: hours, endsNextDay };
};

/** Crée (et enregistre) le shift d'un jour du tour de service */
const registerShift = async (shift, order, newRotation) => {
    const existingShift = await Shift.find({ name: shift.name });

    if (existingShift) {
        for (const shift of existingShift) {
            const isShiftAlreadyInRotation = newRotation.days.some(dayId => dayId.equals(existingShift._id));
            const hasSameNameInRotation = newRotation.days.some(day => day.name === shift.name);

            if (isShiftAlreadyInRotation) {
                throw new AppError(`Le shift "${shift.name}" est déjà présent dans cette rotation`, 400);
            }
            if (hasSameNameInRotation) {
                throw new AppError(`Le shift "${shift.name}" est déjà présent dans cette rotation`, 400);
            }
        }
    }

    let points;
    const endsNextDay = shift.default.endsNextDay;
    const startTime = shift.default.startTime;
    const endTime = shift.default.endTime;

    if (shift.type === 'rest') {
        points = 0;
    } else {
        if (!startTime || !endTime) {
            throw new AppError('Le jour de travail doit avoir un début et une fin', 400);
        }
        const workDuration = computeWorkDuration(startTime, endTime);

        points = workDuration.points;
    }

    const newShift = new Shift({
        name: shift.name,
        order: order,
        optional: shift.optional,
        default: {
            startTime: startTime,
            endTime: endTime,
            points: points,
            endsNextDay: endsNextDay
        },
        type: shift.type
    });

    await newShift.save();
    return newShift;
};

/** Crée (et enregistre) une variante d'un shift */
export const registerVariation = async (variant, shift) => {
    const existingVariation = await Variation.find({ name: variant.name });

    if (existingVariation) {
        for (const variation of existingVariation) {
            const isVariationAlreadyInShift = shift.variations.some(variationId => variationId.equals(variation._id));
            const hasSameNameInShift = shift.variations.some(variation => variation.name === variant.name);
            if (isVariationAlreadyInShift) {
                throw new AppError(`La variation "${variant.name}" est déjà présente dans ce shift`, 400);
            }
            if (hasSameNameInShift) {
                throw new AppError(`La variation "${variant.name}" est déjà présente dans ce shift`, 400);
            }
        }
    }
    if (!variant.startTime || !variant.endTime) {
        throw new AppError('Les variantes doivent avoir un début et une fin', 400);
    }

    const { points } = computeWorkDuration(variant.startTime, variant.endTime);

    const newVariation = new Variation({
        name: variant.name,
        startTime: variant.startTime,
        endTime: variant.endTime,
        points: points,
        endsNextDay: variant.endsNextDay
    });

    await newVariation.save();
    return newVariation;
};

/**
 * Crée un tour de service avec ses jours et leurs variantes.
 * @param {{ name: string, days: Array }} rotation - données reçues (nom, jours avec leurs variantes)
 * @param {string} centerId - centre du tour de service (déjà vérifié par la route)
 * @returns {Promise<Object>} le tour de service enregistré
 */
export async function createRotation (rotation, centerId) {
    if (!rotation.name) {
        throw new AppError('Le nom du tour de service est requis', 400);
    }

    const newRotation = new Rotation({
        name: rotation.name,
        centerId,
    });

    const shifts = rotation.days;

    for (const day of shifts) {
        const order = shifts.indexOf(day) + 1;
        const shift = await registerShift(day, order, newRotation);
        newRotation.days.push(shift._id);

        // Traiter les variations si elles existent
        if (day.variations && day.variations.length > 0) {
            for (const variant of day.variations) {
                const newVariation = await registerVariation(variant, shift);
                shift.variations.push(newVariation._id);
            }
            await shift.save();
        }
    }

    await newRotation.save();
    return newRotation;
}

/**
 * Copie un tour de service (jours et variantes compris) ; la copie commence sans date d'activation.
 * @param {string} id - tour de service à copier
 * @returns {Promise<Object>} la copie
 */
export async function duplicateRotation (id) {
    const rotation = await Rotation.findById(id)
        .populate({
            path: 'days',
            populate: {
                path: 'variations'
            }
        });

    if (!rotation) {
        throw new AppError('Tour de service non trouvé', 404);
    }

    const duplicatedRotation = new Rotation({
        name: `${rotation.name} (copie)`,
        days: [], // On va remplir avec les nouveaux IDs
        centerId: rotation.centerId,
        activationDates: [], // La copie commence sans dates d'activation
        activationDays: [],
    });

    await duplicatedRotation.save();

    for (const day of rotation.days) {
        if (!day.order) {
            day.order = rotation.days.indexOf(day) + 1;
        }

        const shiftData = {
            name: day.name,
            variations: [],
            order: day.order,
            optional: day.optional ? day.optional : false,
            default: {
                startTime: day.default.startTime || null,
                endTime: day.default.endTime || null,
                points: day.default.points || 0,
                endsNextDay: day.default.endsNextDay || false
            },
            type: day.type
        };

        const newShift = new Shift(shiftData);
        duplicatedRotation.days.push(newShift._id);

        // Dupliquer les variations si elles existent
        if (day.variations && day.variations.length > 0) {
            for (const variant of day.variations) {
                const newVariation = new Variation({
                    name: variant.name,
                    startTime: variant.startTime,
                    endTime: variant.endTime,
                    points: variant.points,
                    endsNextDay: variant.endsNextDay
                });

                await newVariation.save();
                newShift.variations.push(newVariation._id);
            }
        }

        await newShift.save();
    }

    await duplicatedRotation.save();
    return duplicatedRotation;
}
