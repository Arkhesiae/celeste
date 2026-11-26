import Center from '../../models/Center.js';
import Rotation from '../../models/Rotation.js';
import { activationAt, activationTimelineOf } from '../rotation/rotation.timeline.js';
import { cycleDayIndex } from '../team/team.cycleIndex.js';

/**
 * La vacation que la rotation prévoit pour une équipe un jour donné, pour le planning d'un utilisateur comme pour la grille d'une
 * équipe : le tour en vigueur ce jour-là (rotation.timeline.js), puis la position de l'équipe dans son cycle (team.cycleIndex.js).
 */

/** `load(key)` appelé une seule fois par clé : les appels suivants, même simultanés, reçoivent la même promesse */
const cachedByKey = (load) => {
    const results = new Map();
    return (key) => {
        const id = String(key);
        if (!results.has(id)) results.set(id, load(id));
        return results.get(id);
    };
};

// Ce qui est mis en cache doit être une vraie promesse, que plusieurs jours peuvent attendre : une Query Mongoose ne s'attend qu'une
// fois, d'où `exec()` (les fonctions `async` en rendent déjà une)
const loadCenter = (centerId) => Center.findById(centerId).select('cycleAnchorDate cycleAnchorDay').lean().exec();

const loadTimeline = async (centerId) =>
    activationTimelineOf(await Rotation.find({ centerId }).select('activationDates activationDays').lean());

const loadRotation = (rotationId) =>
    Rotation.findById(rotationId).populate({ path: 'days', populate: { path: 'variations' } }).exec();

/**
 * Le lecteur de vacations d'équipe, à créer pour un lot de jours (une requête, une grille) : le centre, sa chronologie
 * d'activations et chaque tour ne sont lus qu'une fois, et seulement s'ils servent.
 * Le tour est choisi jour par jour : un lot qui traverse un changement de tour donne à chaque jour le sien.
 * @returns {(team: Object, dayKey: string) => Promise<Object|null>} la vacation (`Shift`, variations peuplées) ; `null` sans
 *   centre, sans tour en vigueur, sans jours dans le tour ou si l'équipe n'a pas de position dans le cycle
 */
export const createTeamShiftReader = () => {
    const centerOf = cachedByKey(loadCenter);
    const timelineOf = cachedByKey(loadTimeline);
    const rotationOf = cachedByKey(loadRotation);

    return async (team, dayKey) => {
        const centerId = team.center?._id ?? team.center;   // centre peuplé ou non
        if (!centerId) return null;

        const activation = activationAt(await timelineOf(centerId), dayKey);
        if (!activation) return null;

        const rotation = await rotationOf(activation.rotation._id);
        if (!rotation?.days?.length) return null;

        const dayIndex = cycleDayIndex(team, await centerOf(centerId), dayKey, rotation.days.length);
        return dayIndex === null ? null : rotation.days[dayIndex] || null;
    };
};
