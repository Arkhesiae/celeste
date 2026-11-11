import Rotation from '../../models/Rotation.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { toPlainDate, toMongoDate } from '../../utils/dates/plainDate.js';

/**
 * Rotation active d'un centre à une date : celle dont la dernière activation est <= au jour de `date`.
 * Renvoie la rotation (objet simple) avec `activationDates` réduit à la date d'activation retenue (comme l'ancienne
 * agrégation), ou null. Les jours d'activation sont lus via le jumeau `activationDays` (repli sur `activationDates`).
 */
const findLatestRotation = async (centerId, date = new Date()) => {
    if (!centerId) {
        throw new Error('Center ID is required');
    }
    const day = toPlainDate(date);
    if (!day) throw new Error('Date invalide');
    const dayKey = day.toString();

    const rotations = await Rotation.find({ centerId, deleted: false }).lean();

    let best = null;
    for (const rotation of rotations) {
        for (const activationDay of activationDaysOf(rotation)) {
            // Les chaînes YYYY-MM-DD se comparent comme les jours
            if (activationDay <= dayKey && (!best || activationDay > best.day)) best = { rotation, day: activationDay };
        }
    }
    if (!best) return null;

    return { ...best.rotation, activationDates: toMongoDate(toPlainDate(best.day)) };
};

export { findLatestRotation };
