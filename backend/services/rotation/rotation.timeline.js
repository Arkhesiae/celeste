import Rotation from '../../models/Rotation.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { toPlainDate, toMongoDate } from '../../utils/dates/plainDate.js';

/**
 * Quel tour de service est en vigueur un jour donné : celui de la dernière activation <= ce jour. La règle est écrite ici et nulle part
 * ailleurs. Les tours supprimés comptent : on ne supprime qu'un tour sans activation en cours ni à venir, et il reste celui des jours
 * passés. Les jours d'activation sont lus via le jumeau `activationDays` (repli sur `activationDates`).
 */

/** Les activations de ces tours, de la plus ancienne à la plus récente : `[{ rotation, day }]` (jour YYYY-MM-DD) */
export const activationTimelineOf = (rotations) =>
    rotations
        .flatMap((rotation) => activationDaysOf(rotation).map((day) => ({ rotation, day })))
        .sort((first, second) => first.day.localeCompare(second.day)); // les clés de jour se comparent comme les jours

/**
 * L'activation en vigueur le jour donné, ou `null`. Deux activations le même jour sont refusées à la saisie ; sur d'anciennes données
 * qui en ont, la dernière de la chronologie l'emporte.
 * @param {Array<{ day: string }>} timeline - voir activationTimelineOf
 * @param {string} dayKey - YYYY-MM-DD
 */
export const activationAt = (timeline, dayKey) => timeline.findLast((activation) => activation.day <= dayKey) ?? null;

/**
 * Rotation en vigueur d'un centre à une date. Renvoie la rotation (objet simple, jours non peuplés) avec `activationDates` réduit à
 * la date d'activation retenue (comme l'ancienne agrégation), ou null.
 */
const findLatestRotation = async (centerId, date = new Date()) => {
    if (!centerId) {
        throw new Error('Center ID is required');
    }
    const day = toPlainDate(date);
    if (!day) throw new Error('Date invalide');

    const rotations = await Rotation.find({ centerId }).lean();
    const activation = activationAt(activationTimelineOf(rotations), day.toString());
    if (!activation) return null;

    return { ...activation.rotation, activationDates: toMongoDate(toPlainDate(activation.day)) };
};

export { findLatestRotation };
