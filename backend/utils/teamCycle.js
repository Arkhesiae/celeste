/**
 * Position d'une équipe dans le cycle de la rotation : une seule formule pour tout le backend.
 *
 * Modèle cible : `Center.cycleAnchorDate` (date de référence unique) + `Team.cycleOffset` (entier 0..N-1, un par
 * équipe). Le début de cycle d'une équipe est alors `anchor + offset` jours.
 *
 * Transition : tant qu'une équipe n'a pas de `cycleOffset` (ou que le centre n'a pas d'ancre), on retombe sur
 * l'ancien champ `Team.cycleStartDate`. Les deux représentations donnent le même planning (voir
 * `scripts/migrateCycleOffsets.js`, qui le vérifie avant d'écrire quoi que ce soit).
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Début de cycle effectif d'une équipe (Date) ou null s'il n'est pas défini */
export const cycleStartOf = (team, center) => {
    if (Number.isInteger(team?.cycleOffset) && center?.cycleAnchorDate) {
        return new Date(new Date(center.cycleAnchorDate).getTime() + team.cycleOffset * DAY_MS);
    }
    return team?.cycleStartDate ? new Date(team.cycleStartDate) : null;
};

/** Modulo toujours positif */
export const mod = (n, m) => ((n % m) + m) % m;

/** Nombre de jours entiers entre deux dates (a -> b), arrondi vers le bas */
export const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / DAY_MS);

/** Indice (0-based) du jour de la rotation pour `date`, selon le début de cycle de l'équipe ; null si inconnu */
export const cycleDayIndex = (team, center, date, total) => {
    const start = cycleStartOf(team, center);
    if (!start || !total) return null;
    return mod(daysBetween(start, date), total);
};
