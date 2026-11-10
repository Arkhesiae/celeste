import { compareDays } from './dates/plainDate.js';

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
    const sorted = occurrences.slice().sort((a, b) => compareDays(b.fromDate, a.fromDate));
    const started = (o) => compareDays(o.fromDate, day) <= 0;

    return sorted.find((o) => o.toDate && started(o) && compareDays(o.toDate, day) >= 0)
        ?? sorted.find((o) => !o.toDate && started(o))
        ?? null;
};
