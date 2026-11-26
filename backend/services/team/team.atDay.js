import { occurrenceDays } from '../../utils/dates/dayAccess.js';

/**
 * Quelle équipe est celle d'un utilisateur un jour donné : la règle est écrite ici et nulle part ailleurs.
 * Un renfort (occurrence bornée, `toDate` inclus) l'emporte sur l'équipe permanente ; entre plusieurs occurrences du même type,
 * celle qui a commencé le plus récemment (à jour de début égal, la première de la liste). Une occurrence sans équipe
 * (`teamId: null`, fin d'appartenance) dit qu'il n'en a plus ; à jour de début égal, une équipe passe devant elle.
 *
 * Les bornes `fromDate` / `toDate` sont lues comme des jours, qu'elles soient stockées en Date (minuit UTC, ancien
 * stockage) ou en chaîne YYYY-MM-DD (stockage normalisé).
 *
 * Les fonctions « sur des bornes » prennent des éléments `{ teamId, from, to }` (jours YYYY-MM-DD, `to` nul = sans fin), voir
 * `withDays` ; elles les rendent tels quels.
 */

/** Les occurrences de `user.teams` avec leurs bornes en jours : `{ occurrence, teamId, from, to }` */
export const withDays = (occurrences) =>
    occurrences.map((occurrence) => ({ occurrence, teamId: occurrence.teamId, ...occurrenceDays(occurrence) }));

/** La plus récente d'abord ; à jour de début égal, une équipe avant la marque « sans équipe » (les clés se comparent comme les jours) */
const byPrecedence = (a, b) =>
    (a.from < b.from ? 1 : a.from > b.from ? -1 : Number(a.teamId === null) - Number(b.teamId === null));

/** Les occurrences bornées (renforts) qui couvrent le jour, la plus récente d'abord */
export const reinforcementsAt = (items, dayKey) =>
    items.filter((item) => item.to && item.from <= dayKey && item.to >= dayKey).sort(byPrecedence);

/**
 * L'occurrence permanente en vigueur le jour donné (la dernière commencée), qu'un renfort couvre ce jour ou non. Peut être la
 * marque « sans équipe » (`teamId: null`) : l'utilisateur n'a alors plus d'équipe permanente. `null` si aucune n'a commencé.
 */
export const permanentAt = (items, dayKey) =>
    items.filter((item) => !item.to && item.from <= dayKey).sort(byPrecedence)[0] ?? null;

/** L'élément qui fait autorité le jour donné (renfort, sinon permanente), marque comprise, ou `null` */
export const ownerAt = (items, dayKey) => reinforcementsAt(items, dayKey)[0] ?? permanentAt(items, dayKey);

/**
 * Équipe d'un utilisateur un jour donné.
 * @param {Array} occurrences - user.teams : { teamId, fromDate, toDate? }
 * @param {Temporal.PlainDate|string} day - un `PlainDate` ou une clé YYYY-MM-DD
 * @returns {Object|null} l'occurrence qui fait autorité, telle quelle (teamId éventuellement peuplé) ; `null` sans équipe
 */
export const getTeamAtDay = (occurrences, day) => {
    const owner = ownerAt(withDays(occurrences), day.toString());
    // `== null` : la marque, ou une équipe peuplée disparue de la base
    return owner && owner.teamId != null ? owner.occurrence : null;
};
