import { toPlainDate, daysBetween } from '../../utils/dates/plainDate.js';
import { anchorDayOf } from '../../utils/dates/dayAccess.js';
import { mod } from '../../utils/math.js';

/**
 * Position d'une équipe dans le cycle de la rotation : une seule formule pour tout le backend.
 *
 * Modèle cible : `Center.cycleAnchorDate` (date de référence unique) + `Team.cycleOffset` (entier 0..N-1, un par
 * équipe). Le début de cycle d'une équipe est alors `anchor + offset` jours.
 *
 * Transition : tant qu'une équipe n'a pas de `cycleOffset` (ou que le centre n'a pas d'ancre), on retombe sur
 * l'ancien champ `Team.cycleStartDate`. Les deux représentations donnent le même planning (voir
 * `scripts/migrateCycleOffsets.js`, qui le vérifie avant d'écrire quoi que ce soit).
 *
 * Les dates sont des jours calendaires (voir utils/dates/plainDate.js).
 */

/** Début de cycle effectif d'une équipe (PlainDate) ou null s'il n'est pas défini */
// TEMPORARY(day-fields): le repli sur Team.cycleStartDate disparait quand tous les centres sont migres (ancre + decalage) ; la fonction ne gardera que la branche ancre.
const cycleStartOf = (team, center) => {
    const anchorDay = Number.isInteger(team?.cycleOffset) ? anchorDayOf(center) : null;   // jumeau « jour », repli sur l'ancien champ
    if (anchorDay) {
        return toPlainDate(anchorDay).add({ days: team.cycleOffset });
    }
    return team?.cycleStartDate ? toPlainDate(team.cycleStartDate) : null;
};

/** Indice (0-based) du jour de la rotation pour `date`, selon le début de cycle de l'équipe ; null si inconnu */
export const cycleDayIndex = (team, center, date, total) => {
    const start = cycleStartOf(team, center);
    if (!start || !total) return null;
    return mod(daysBetween(start, date), total);
};
