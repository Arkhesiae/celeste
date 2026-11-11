import { Temporal } from '@js-temporal/polyfill';

import { DAY_MS, DEFAULT_TIME_ZONE } from './constants.js';
const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const fromInstant = (epochMs, timeZone) => {
    if (epochMs % DAY_MS === 0) {
        return Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO('UTC').toPlainDate();
    }
    return Temporal.Instant.fromEpochMilliseconds(epochMs).toZonedDateTimeISO(timeZone).toPlainDate();
};

/**
 * Jour calendaire (Temporal.PlainDate) d'une valeur reçue, dans le fuseau d'un centre.
 *
 * Les dates stockées par l'application sont de deux sortes :
 *   - un JOUR (« la vacation du 8 novembre ») : chaîne YYYY-MM-DD, ou ancien stockage Mongo en `Date` à minuit UTC ;
 *   - un INSTANT (« maintenant », un horodatage) : n'a de jour qu'une fois placé dans un fuseau horaire.
 *
 * Règles de lecture :
 *   - PlainDate, ou chaîne YYYY-MM-DD ................................. ce jour, tel quel ;
 *   - Date ou chaîne ISO à minuit UTC pile (ancien stockage d'un jour) .. le jour UTC, tel quel ;
 *   - tout autre instant (Date, ISO avec Z ou décalage) ............... son jour dans le fuseau du centre ;
 *   - ISO sans décalage (2026-11-08T10:00:00) ......................... le jour écrit dans la chaîne (heure locale).
 *
 * Un instant exactement à minuit UTC est donc toujours lu comme un jour : c'est la signature de l'ancien stockage
 * (`Date.UTC(y, m, d)`), et un horodatage réel y tombe à la milliseconde près avec une probabilité négligeable.
 *
 * @param {Date|string|Temporal.PlainDate} value
 * @param {string} [timeZone] - fuseau IANA du centre
 * @returns {Temporal.PlainDate|null} null si la valeur n'est pas une date valide
 */
// TEMPORARY(day-fields): la regle « minuit UTC = jour stocke tel quel » n'a de sens que tant que des `Date` sont stockees ; ensuite, un jour est une chaine YYYY-MM-DD et seuls les instants passent par le fuseau du centre.
export const toCalendarDay = (value, timeZone = DEFAULT_TIME_ZONE) => {
    try {
        if (value instanceof Temporal.PlainDate) return value;
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : fromInstant(value.getTime(), timeZone);

        if (typeof value === 'string') {
            const text = value.trim();
            if (DAY_ONLY.test(text)) return Temporal.PlainDate.from(text);
            // Avec décalage ou Z : un instant. Sans : une date-heure locale, dont on garde le jour écrit.
            if (/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) return fromInstant(Temporal.Instant.from(text).epochMilliseconds, timeZone);
            return Temporal.PlainDateTime.from(text).toPlainDate();
        }
    } catch {
        return null;
    }
    return null;
};
