import { AppError } from '../error/AppError.js';
import { toDateKey } from './dateKey.js';

/**
 * Les équipes d'un utilisateur sont stockées en "occurrences" ({ teamId, fromDate, toDate|null }) qui
 * peuvent se chevaucher. Ces helpers les convertissent en segments contigus et comparent deux listes.
 *
 * Segment : { teamId: string, from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' | null }
 *   - `to` inclus ; `null` = sans limite de fin
 *   - les segments sont triés, disjoints, et deux segments contigus de la même équipe sont fusionnés
 *   - les jours sans équipe n'appartiennent à aucun segment
 *
 * Règle de propriétaire d'un jour (identique à getTeamAtGivenDate) : une occurrence bornée (renfort) qui
 * couvre le jour l'emporte sur l'occurrence permanente (sans toDate) ; à égalité de type, la plus récente
 * `fromDate` l'emporte.
 *
 * Fonctions pures, sans accès base de données.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const shiftKey = (key, days) =>
    new Date(Date.parse(`${key}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);

const idOf = (teamId) => String(teamId?._id ?? teamId);

function normalizeOccurrences (occurrences) {
    return occurrences.map((occurrence) => {
        const from = toDateKey(occurrence.fromDate);
        const to = occurrence.toDate == null ? null : toDateKey(occurrence.toDate);
        if (!from || (occurrence.toDate != null && !to)) {
            throw new AppError("Occurrence d'équipe invalide : date de début ou de fin illisible.", 400);
        }
        return { teamId: idOf(occurrence.teamId), from, to };
    });
}

/**
 * Équipe propriétaire d'un jour donné.
 * @param {Array<{ teamId, fromDate, toDate? }>} occurrences
 * @param {string|Date} date
 * @returns {string|null} teamId, ou null si aucune équipe
 */
export function getOwnerTeamIdAt (occurrences, date) {
    const key = toDateKey(date);
    if (!key) throw new AppError('Date invalide.', 400);
    return ownerAt(normalizeOccurrences(occurrences), key);
}

function ownerAt (normalized, key) {
    return ownerOccurrenceAt(normalized, key)?.teamId ?? null;
}

/** Occurrence qui fait autorité un jour donné (renfort borné > permanente, puis la plus récente), ou null. */
function ownerOccurrenceAt (normalized, key) {
    let bounded = null;
    let permanent = null;

    for (const occ of normalized) {
        if (occ.from > key) continue;
        if (occ.to === null) {
            if (!permanent || occ.from > permanent.from) permanent = occ;
        } else if (occ.to >= key) {
            if (!bounded || occ.from > bounded.from) bounded = occ;
        }
    }

    return bounded ?? permanent ?? null;
}

/**
 * Découpe un ensemble de segments (ou d'occurrences normalisées) en intervalles élémentaires sur lesquels
 * rien ne change, puis appelle `ownerOf(startKey)` pour chacun et fusionne les intervalles contigus
 * ayant le même résultat (selon `sameResult`).
 */
function sweep (boundaries, resultAt, sameResult, build) {
    const sorted = [...new Set(boundaries)].sort();
    const output = [];

    sorted.forEach((start, i) => {
        const result = resultAt(start);
        const to = i + 1 < sorted.length ? shiftKey(sorted[i + 1], -1) : null;
        const last = output.at(-1);

        if (last && last.to !== null && shiftKey(last.to, 1) === start && sameResult(last.result, result)) {
            last.to = to;
        } else {
            output.push({ from: start, to, result });
        }
    });

    return output.map(build);
}

/**
 * Identifie les segments contigus de propriété d'équipe.
 * @param {Array<{ teamId, fromDate, toDate? }>} occurrences - ex. user.teams
 * @returns {Array<{ teamId: string, from: string, to: string|null }>}
 */
export function buildTeamSegments (occurrences) {
    const normalized = normalizeOccurrences(occurrences);

    const boundaries = normalized.flatMap(({ from, to }) => (to === null ? [from] : [from, shiftKey(to, 1)]));

    return sweep(
        boundaries,
        (key) => ownerAt(normalized, key),
        (a, b) => a === b,
        ({ from, to, result }) => ({ teamId: result, from, to })
    ).filter((segment) => segment.teamId !== null);
}

/**
 * Comme buildTeamSegments, mais chaque segment indique aussi s'il vient d'une affectation permanente ou d'un
 * renfort (occurrence bornée) : `kind: 'permanent' | 'reinforcement'`. Deux segments contigus fusionnent
 * seulement s'ils ont la même équipe ET le même type. Sert à l'affichage (frises).
 * @param {Array<{ teamId, fromDate, toDate? }>} occurrences - ex. user.teams
 * @returns {Array<{ teamId: string, kind: 'permanent'|'reinforcement', from: string, to: string|null }>}
 */
export function buildTeamTimeline (occurrences) {
    const normalized = normalizeOccurrences(occurrences);

    const boundaries = normalized.flatMap(({ from, to }) => (to === null ? [from] : [from, shiftKey(to, 1)]));

    return sweep(
        boundaries,
        (key) => {
            const occ = ownerOccurrenceAt(normalized, key);
            return occ ? { teamId: occ.teamId, kind: occ.to === null ? 'permanent' : 'reinforcement' } : null;
        },
        (a, b) => a?.teamId === b?.teamId && a?.kind === b?.kind,
        ({ from, to, result }) => (result ? { teamId: result.teamId, kind: result.kind, from, to } : null)
    ).filter(Boolean);
}

/**
 * Identifie les changements de propriété entre deux listes de segments.
 * Un changement est une plage contiguë de jours où l'équipe propriétaire diffère entre les deux listes.
 * `oldTeam` / `newTeam` valent null quand aucune équipe n'est propriétaire (avant / après).
 *
 * Les bornes sont incluses et `to: null` signifie sans limite : le résultat peut être passé tel quel
 * (`{ from, to }`) à sanitizeUserPeriod.
 *
 * @param {Array<{ teamId, from, to? }>} before - segments (voir buildTeamSegments)
 * @param {Array<{ teamId, from, to? }>} after
 * @returns {Array<{ from: string, to: string|null, oldTeam: string|null, newTeam: string|null }>}
 */
export function diffTeamSegments (before, after) {
    const normalize = (segments) => segments.map((segment) => {
        const from = toDateKey(segment.from);
        const to = segment.to == null ? null : toDateKey(segment.to);
        if (!from || (segment.to != null && !to)) {
            throw new AppError('Segment invalide : date de début ou de fin illisible.', 400);
        }
        return { teamId: idOf(segment.teamId), from, to };
    });

    const oldSegments = normalize(before);
    const newSegments = normalize(after);

    const ownerIn = (segments, key) =>
        segments.find((s) => s.from <= key && (s.to === null || s.to >= key))?.teamId ?? null;

    const boundaries = [...oldSegments, ...newSegments]
        .flatMap(({ from, to }) => (to === null ? [from] : [from, shiftKey(to, 1)]));

    return sweep(
        boundaries,
        (key) => ({ oldTeam: ownerIn(oldSegments, key), newTeam: ownerIn(newSegments, key) }),
        (a, b) => a.oldTeam === b.oldTeam && a.newTeam === b.newTeam,
        ({ from, to, result }) => ({ from, to, ...result })
    ).filter(({ oldTeam, newTeam }) => oldTeam !== newTeam);
}
