import { Temporal } from '@js-temporal/polyfill';

/**
 * Temps d'une vacation, avec Temporal.
 *
 * Une vacation (« shift ») d'un planning est décrite par :
 *   - `date`        : le jour où elle COMMENCE, clé `YYYY-MM-DD` ;
 *   - `startTime`   : heure de début `HH:mm` ;
 *   - `endTime`     : heure de fin `HH:mm` ;
 *   - `endsNextDay` : vrai si elle finit le lendemain (nuit 22:00 -> 06:00).
 * Ces heures sont des heures LOCALES du centre (`Center.timeZone`). Toutes les vacations d'un planning sont donc lues
 * dans le même fuseau : celui du centre de l'utilisateur.
 *
 * Pour calculer (repos, charge, fenêtres de 7 jours) on en fait des `Temporal.ZonedDateTime` dans ce fuseau :
 * les durées sont alors réelles, y compris la nuit d'un changement d'heure (7h ou 9h).
 *
 * Deux fonctions seulement : `withZonedBounds` (clé + heures -> instants du fuseau) et `wallClockIso` (instant ->
 * texte lu par le front).
 */

/**
 * Début et fin d'une vacation dans un fuseau.
 * Une heure qui n'existe pas (saut de printemps, 02:30) est décalée après le saut ; une heure qui existe deux fois
 * (retour d'automne, 02:30) prend la première occurrence (désambiguïsation `compatible` de Temporal).
 *
 * @param {{ date: string, startTime: string, endTime: string, endsNextDay?: boolean }} shift
 * @param {string} timeZone - fuseau IANA du centre
 * @returns {{ start: Temporal.ZonedDateTime, end: Temporal.ZonedDateTime }}
 */
const zonedBoundsOf = (shift, timeZone) => {
    const [startHour, startMinute] = shift.startTime.split(':').map(Number);
    const [endHour, endMinute] = shift.endTime.split(':').map(Number);
    const startDay = Temporal.PlainDate.from(shift.date);
    const endDay = shift.endsNextDay ? startDay.add({ days: 1 }) : startDay;
    const disambiguation = { disambiguation: 'compatible' };
    return {
        start: startDay.toPlainDateTime({ hour: startHour, minute: startMinute }).toZonedDateTime(timeZone, disambiguation),
        end: endDay.toPlainDateTime({ hour: endHour, minute: endMinute }).toZonedDateTime(timeZone, disambiguation),
    };
};

/**
 * Ajoute `start` et `end` (ZonedDateTime) à chaque vacation d'une liste, sans modifier les autres champs.
 *
 * @param {Array<{ date: string, startTime: string, endTime: string, endsNextDay?: boolean }>} shifts
 * @param {string} timeZone - fuseau IANA du centre
 * @returns {Array} les mêmes vacations avec `start` et `end`
 */
export const withZonedBounds = (shifts, timeZone) =>
    shifts.map(shift => ({ ...shift, ...zonedBoundsOf(shift, timeZone) }));

/**
 * Heure murale d'un instant, au format que lit le front : l'heure locale du centre écrite avec un `Z`
 * (`2026-03-28T22:00:00.000Z` pour 22:00 à Paris). Le front en affiche les heures UTC, qui sont donc celles du centre.
 *
 * @param {Temporal.ZonedDateTime} zonedDateTime
 * @returns {string}
 */
export const wallClockIso = (zonedDateTime) =>
    `${zonedDateTime.toPlainDateTime().toString({ fractionalSecondDigits: 3 })}Z`;
