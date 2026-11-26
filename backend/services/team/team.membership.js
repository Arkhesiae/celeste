import { occurrenceDays } from '../../utils/dates/dayAccess.js';
import { toMongoDate, toPlainDate } from '../../utils/dates/plainDate.js';
import { getTeamAtDay } from './team.atDay.js';

/**
 * Fin d'appartenance à une équipe (mutation, changement de centre, centre supprimé). Les équipes d'un utilisateur ne sont jamais
 * effacées : son planning passé se calcule à partir d'elles. Une occurrence « sans équipe » (`teamId: null`, permanente) dit qu'à
 * partir de ce jour il n'en a plus.
 */

/**
 * @param {Array} occurrences - user.teams
 * @param {string} today - `YYYY-MM-DD`, premier jour sans équipe
 * @returns {Array} les occurrences passées telles quelles, les renforts qui couraient encore arrêtés la veille, les occurrences
 *   à partir d'aujourd'hui retirées, et la marque « sans équipe » si une équipe était encore la sienne. Fonction pure.
 */
export function endTeamMembership (occurrences, today) {
    const yesterday = toPlainDate(today).subtract({ days: 1 }).toString();

    const kept = [...(occurrences ?? [])]
        // Ce qui commence aujourd'hui ou plus tard n'a jamais eu lieu (une équipe permanente à venir passerait devant la marque)
        .filter((occurrence) => occurrenceDays(occurrence).from < today)
        .map((occurrence) => {
            const { to } = occurrenceDays(occurrence);
            if (!to || to < today) return occurrence;
            // Un renfort l'emporte sur l'affectation permanente : il s'arrête la veille, sinon il passerait devant la marque
            // TEMPORARY(day-fields): `toDate` disparaît avec l'ancien champ
            return { ...(occurrence.toObject?.() ?? occurrence), toDate: toMongoDate(toPlainDate(yesterday)), toDay: yesterday };
        });

    if (!getTeamAtDay(kept, toPlainDate(today))) return kept;   // déjà sans équipe : rien à marquer

    // TEMPORARY(day-fields): `fromDate` / `toDate` disparaissent avec les anciens champs
    return [...kept, { teamId: null, fromDate: toMongoDate(toPlainDate(today)), fromDay: today, toDate: null, toDay: null }];
}
