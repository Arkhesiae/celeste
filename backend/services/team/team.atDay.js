import { occurrenceDays } from './dates/dayAccess.js';

/**
 * Équipe d'un utilisateur un jour donné (Temporal.PlainDate) : un renfort (occurrence bornée, `toDate` inclus) l'emporte
 * sur l'équipe permanente ; entre plusieurs occurrences du même type, la plus récente.
 *
 * Les bornes `fromDate` / `toDate` sont lues comme des jours, qu'elles soient stockées en Date (minuit UTC, ancien
 * stockage) ou en chaîne YYYY-MM-DD (stockage normalisé).
 *
 * @param {Array} occurrences - user.teams : { teamId, fromDate, toDate? }
 * @param {Temporal.PlainDate} day
 * @returns {Object|null} l'occurrence qui fait autorité, telle quelle (teamId éventuellement peuplé)
 */
export const getTeamAtDay = (occurrences, day) => {
    const dayKey = day.toString();
    // Bornes en jours (jumeau YYYY-MM-DD, repli signalé sur l'ancien champ) : les chaînes se comparent comme les jours
    const withDays = occurrences.map((occurrence) => ({ occurrence, ...occurrenceDays(occurrence) }));
    const sorted = withDays.sort((a, b) => (a.from < b.from ? 1 : a.from > b.from ? -1 : 0));
    const started = (o) => o.from <= dayKey;

    const found = sorted.find((o) => o.to && started(o) && o.to >= dayKey)
        ?? sorted.find((o) => !o.to && started(o));
    return found?.occurrence ?? null;
};
