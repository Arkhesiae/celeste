import { Temporal } from '@js-temporal/polyfill';
import User from '../../models/User.js';
import { toPlainDate, daysBetween } from '../../utils/dates/plainDate.js';
import { findOrThrow } from '../../utils/mongo.js';
import Team from '../../models/Team.js';
import { AppError } from '../../error/AppError.js';
import { buildTeamTimeline } from '../../utils/teamSegments.js';
import { toDateKey } from '../../utils/dates/dateKey.js';

import { TEAM_TIMELINE_MAX_DAYS as MAX_WINDOW_DAYS } from '../../config/limits.js';
/**
 * Données des frises d'équipes (passé, présent, futur) : pour chaque personne, les périodes pendant lesquelles
 * chaque équipe est effectivement la sienne, avec le type `permanent` / `reinforcement`.
 * La règle « un renfort l'emporte sur l'affectation permanente » vient de utils/teamSegments.js, pour qu'il n'y ait
 * qu'une seule source de vérité côté serveur : le front ne fait que dessiner.
 *
 * Fenêtre : { from, to } en YYYY-MM-DD, bornes incluses ; par défaut 3 mois avant et 9 mois après aujourd'hui.
 */

const shiftMonths = (key, months) => Temporal.PlainDate.from(key).add({ months }).toString();

/** @returns {{ from: string, to: string }} */
export function resolveWindow ({ from, to } = {}, now = new Date()) {
    const today = toPlainDate(now).toString();
    const fromKey = from ? toDateKey(from) : shiftMonths(today, -3);
    const toKey = to ? toDateKey(to) : shiftMonths(today, 9);

    if (!fromKey || !toKey) throw new AppError('Période invalide : dates illisibles.', 400);
    if (toKey < fromKey) throw new AppError('Période invalide : "to" est antérieur à "from".', 400);
    if (daysBetween(fromKey, toKey) > MAX_WINDOW_DAYS) {
        throw new AppError(`Période trop longue (maximum ${MAX_WINDOW_DAYS} jours).`, 400);
    }
    return { from: fromKey, to: toKey };
}

const intersects = (segment, window) =>
    segment.from <= window.to && (segment.to === null || segment.to >= window.from);

const publicSegment = ({ kind, from, to }) => ({ kind, from, to });

/**
 * Frise de chaque équipe d'un centre : ses membres (actuels, passés, à venir) et leurs périodes.
 * @returns {Promise<{ window, teams: Array<{ teamId, teamName, members: Array<{ userId, name, lastName, segments }> }> }>}
 */
export async function getCenterTeamsTimeline (centerId, period, now = new Date()) {
    const window = resolveWindow(period, now);

    const [teams, users] = await Promise.all([
        Team.find({ center: centerId, deleted: { $ne: true } }).select('name'),
        User.find({ centerId, isActive: { $ne: false } }).select('name lastName teams'),
    ]);

    const byTeam = new Map(teams.map((team) => [String(team._id), { teamId: team._id, teamName: team.name, members: [] }]));

    for (const user of users) {
        const perTeam = new Map();
        for (const segment of buildTeamTimeline(user.teams ?? [])) {
            if (!byTeam.has(segment.teamId) || !intersects(segment, window)) continue;
            if (!perTeam.has(segment.teamId)) perTeam.set(segment.teamId, []);
            perTeam.get(segment.teamId).push(publicSegment(segment));
        }
        for (const [teamId, segments] of perTeam) {
            byTeam.get(teamId).members.push({ userId: user._id, name: user.name, lastName: user.lastName, segments });
        }
    }

    return { window, teams: [...byTeam.values()] };
}

/**
 * Frise des équipes d'un utilisateur : une entrée par équipe avec ses périodes dans la fenêtre.
 * @returns {Promise<{ window, teams: Array<{ teamId, teamName, segments }> }>}
 */
export async function getUserTeamTimeline (userId, period, now = new Date()) {
    const window = resolveWindow(period, now);

    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', select: 'teams' });
    const segments = buildTeamTimeline(user.teams ?? []).filter((segment) => intersects(segment, window));
    const teamIds = [...new Set(segments.map((s) => s.teamId))];
    const teams = await Team.find({ _id: { $in: teamIds } }).select('name');
    const nameById = new Map(teams.map((team) => [String(team._id), team.name]));

    const grouped = new Map();
    for (const segment of segments) {          // déjà triés par date de début
        if (!grouped.has(segment.teamId)) {
            grouped.set(segment.teamId, { teamId: segment.teamId, teamName: nameById.get(segment.teamId) ?? null, segments: [] });
        }
        grouped.get(segment.teamId).segments.push(publicSegment(segment));
    }

    return { window, teams: [...grouped.values()] };
}
