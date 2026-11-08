import { Temporal } from '@js-temporal/polyfill';
import { toPlainDate } from './teamCycle.js';

export const getTeamAtGivenDate = (teamOccurences, date) => {
    const sortedTeamOccurences = teamOccurences.slice().sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));


    // En cas de renfort, retourne l'équipe de renfort
    for (const team of sortedTeamOccurences) {
        if (new Date(team.fromDate) <= date && new Date(team.toDate) >= date) {
            return team;
        }
    }

    // Sinon, l'équipe permanente
    for (const team of sortedTeamOccurences) {
        if (!team.toDate && new Date(team.fromDate) <= date) {
            return team;
        }
    }

    return null;
};

/**
 * Même règle que getTeamAtGivenDate, sur un jour calendaire (Temporal.PlainDate) : un renfort (occurrence bornée)
 * l'emporte sur l'équipe permanente. Les bornes `fromDate` / `toDate` (incluses) sont lues comme des jours, qu'elles
 * soient stockées en Date (minuit UTC) ou en chaîne YYYY-MM-DD.
 * @param {Array} occurrences - user.teams
 * @param {Temporal.PlainDate} day
 */
export const getTeamAtDay = (occurrences, day) => {
    const from = (o) => toPlainDate(o.fromDate);
    const sorted = occurrences.slice().sort((a, b) => Temporal.PlainDate.compare(from(b), from(a)));
    const started = (o) => Temporal.PlainDate.compare(from(o), day) <= 0;

    return sorted.find((o) => o.toDate && started(o) && Temporal.PlainDate.compare(toPlainDate(o.toDate), day) >= 0)
        ?? sorted.find((o) => !o.toDate && started(o))
        ?? null;
};
