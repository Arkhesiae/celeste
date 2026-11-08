import { Temporal } from '@js-temporal/polyfill';
import { toDateKey } from './dateKey.js';

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
 * Dates : un jour de cycle est une date de calendrier, donc `Temporal.PlainDate` (pas de fuseau, pas d'heure, pas de
 * piège d'heure d'été). Les `Date` ne servent qu'aux frontières : champs Mongoose et requêtes ($lte...). Toute valeur
 * reçue (Date, chaîne ISO, YYYY-MM-DD) est lue comme son jour calendaire UTC ; l'heure éventuelle est ignorée.
 */

/** Modulo toujours positif */
export const mod = (n, m) => ((n % m) + m) % m;

/** Date | chaîne ISO | YYYY-MM-DD | PlainDate -> PlainDate (jour calendaire UTC) ; null si la valeur n'est pas une date */
export const toPlainDate = (value) => {
    if (value instanceof Temporal.PlainDate) return value;
    const key = toDateKey(value);
    return key ? Temporal.PlainDate.from(key) : null;
};

/** PlainDate -> Date à minuit UTC : pour écrire dans Mongo ou interroger par date, nulle part ailleurs */
export const toMongoDate = (plainDate) => new Date(`${plainDate.toString()}T00:00:00Z`);

/** Nombre de jours calendaires entre deux dates (a -> b) ; négatif si b précède a */
export const daysBetween = (a, b) => toPlainDate(a).until(toPlainDate(b), { largestUnit: 'days' }).days;

/** Jours YYYY-MM-DD de `from` à `to` inclus (tableau vide si `to` précède `from`) */
export const eachDay = (from, to) => {
    const days = [];
    for (let day = toPlainDate(from), last = toPlainDate(to); Temporal.PlainDate.compare(day, last) <= 0; day = day.add({ days: 1 })) {
        days.push(day.toString());
    }
    return days;
};

/** Début de cycle effectif d'une équipe (PlainDate) ou null s'il n'est pas défini */
export const cycleStartOf = (team, center) => {
    if (Number.isInteger(team?.cycleOffset) && center?.cycleAnchorDate) {
        return toPlainDate(center.cycleAnchorDate).add({ days: team.cycleOffset });
    }
    return team?.cycleStartDate ? toPlainDate(team.cycleStartDate) : null;
};

/** Indice (0-based) du jour de la rotation pour `date`, selon le début de cycle de l'équipe ; null si inconnu */
export const cycleDayIndex = (team, center, date, total) => {
    const start = cycleStartOf(team, center);
    if (!start || !total) return null;
    return mod(daysBetween(start, date), total);
};
