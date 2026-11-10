import { Temporal } from '@js-temporal/polyfill';
import { toDateKey } from './dateKey.js';
import { DEFAULT_TIME_ZONE } from './constants.js';

/**
 * Jours calendaires : `Temporal.PlainDate` partout dans le code, `Date` uniquement à la frontière Mongo.
 *
 * Un jour (la vacation du 8 novembre) n'a ni heure ni fuseau. Les champs Mongoose qui en portent un sont encore des
 * `Date` à minuit UTC ; ces fonctions les lisent comme leur jour UTC et rendent des `PlainDate`, de sorte que le
 * jour où ces champs deviendront des chaînes `YYYY-MM-DD` (stockage normalisé), seuls `toMongoDate` et le schéma changent.
 *
 * Pour un INSTANT (« maintenant », un horodatage) à placer sur un jour, voir `toCalendarDay` (dates/calendarDay.js),
 * qui prend le fuseau du centre.
 */

/** Date | chaîne ISO | YYYY-MM-DD | PlainDate -> PlainDate (jour calendaire UTC) ; null si la valeur n'est pas une date */
export const toPlainDate = (value) => {
    if (value instanceof Temporal.PlainDate) return value;
    const key = toDateKey(value);
    if (!key) return null;
    try {
        return Temporal.PlainDate.from(key);
    } catch {
        return null;   // forme valide mais jour inexistant (2026-02-30)
    }
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

/** Compare deux jours (Date, ISO, YYYY-MM-DD, PlainDate) : négatif si a précède b, 0 si égaux, positif sinon */
export const compareDays = (a, b) => Temporal.PlainDate.compare(toPlainDate(a), toPlainDate(b));

/** Le jour courant dans le fuseau d'un centre */
export const todayIn = (timeZone = DEFAULT_TIME_ZONE) => Temporal.Now.plainDateISO(timeZone);

/** Minuit UTC du jour d'une date (Date) : pour les scripts de données de test qui fabriquent des `Date` */
export const utcMidnight = (date = new Date()) => toMongoDate(toPlainDate(date));

/** Date (minuit UTC) décalée de `days` jours : pour les scripts de données de test */
export const addUtcDays = (date, days) => toMongoDate(toPlainDate(date).add({ days }));
