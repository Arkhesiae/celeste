import { findOrThrow, inTransaction } from '../../utils/mongo.js';
import { toDay } from '../../utils/dates/dayFields.js';
import { sameId } from '../../utils/ids.js';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import { AppError } from '../../error/AppError.js';
import { buildTeamSegments, diffTeamSegments } from '../../utils/teamSegments.js';
import { previewUserPeriodImpact, sanitizeUserPeriod } from './user.sanitizePeriod.js';
import { notifyDemandChanges } from '../email/demand/demandChangeNotifications.js';


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Prépare un changement d'équipe sans rien écrire : segments avant/après, périodes modifiées
 * (bornes incluses, `to: null` = sans limite).
 */
function planTeamChange (user, afterTeams) {
    const before = buildTeamSegments(user.teams);
    const after = buildTeamSegments(afterTeams);
    return { before, after, changes: diffTeamSegments(before, after) };
}

/**
 * Charge l'impact de chaque période modifiée. Retourne `null` si rien n'est affecté,
 * sinon la réponse d'approbation (renvoyée en 409 par le contrôleur) : segments avant/après pour
 * l'affichage graphique, et pour chaque période les demandes à annuler / dont se désister
 * et les entrées de calendrier qui seront annulées.
 */
async function buildApprovalRequest (user, { before, after, changes }) {
    const impacts = await Promise.all(changes.map((change) => previewUserPeriodImpact(user._id, change)));

    if (!impacts.some(({ substitutions, entries }) => substitutions.length || entries.length)) {
        return null;
    }

    const teamIds = [...new Set([...before, ...after].map((s) => s.teamId)
        .concat(changes.flatMap((c) => [c.oldTeam, c.newTeam]).filter(Boolean)))];
    const teams = await Team.find({ _id: { $in: teamIds } }).select('name');

    return {
        needsApproval: true,
        message: "Ce changement d'équipe annulera des demandes et des entrées de calendrier. Confirmation requise.",
        segments: { before, after },
        teams: Object.fromEntries(teams.map((team) => [team._id.toString(), team.name])),
        changes: changes.map((change, i) => ({ ...change, ...impacts[i] })),
    };
}

/**
 * Assainit chaque période modifiée (substitutions + entrées de calendrier) puis enregistre les nouvelles
 * occurrences — le tout dans la transaction fournie.
 */
async function sanitizeAndSaveTeams (user, afterTeams, session) {
    const { changes } = planTeamChange(user, afterTeams);
    const cancelled = new Set();
    const withdrawn = new Set();

    for (const { from, to } of changes) {
        const result = await sanitizeUserPeriod(user._id, { from, to }, { session });
        result.cancelled.forEach((id) => cancelled.add(id));
        result.withdrawn.forEach((id) => withdrawn.add(id));
    }

    user.teams = afterTeams;
    await user.save({ session });

    // changes + demandes annulées (cascade comprise) / dont l'utilisateur s'est retiré, pour prévenir les tiers après le commit
    return { changes, cancelled: [...cancelled], withdrawn: [...withdrawn] };
}

/**
 * Applique un changement d'équipe : sans `confirmed`, retourne une demande d'approbation si des demandes
 * ou entrées de calendrier seraient affectées ; sinon (ou une fois confirmé) l'applique en transaction.
 * @param {string} userId
 * @param {(user) => Array} computeAfter - occurrences après changement (peut lever une AppError)
 * @param {boolean} confirmed
 * @param {string} [actorId] - qui déclenche le changement : n'est pas notifié par email (voir notifyDemandChanges)
 */
async function applyTeamChange (userId, computeAfter, confirmed, actorId) {
    if (!confirmed) {
        const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
        const plan = planTeamChange(user, computeAfter(user));
        const approval = await buildApprovalRequest(user, plan);
        if (approval) return approval;
    }

    const { changes, cancelled, withdrawn } = await inTransaction(async (session) => {
        const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', session });
        return sanitizeAndSaveTeams(user, computeAfter(user), session);
    });

    // Après le commit uniquement : les tiers touchés (contrepartie, demandes en cascade) sont prévenus par email
    notifyDemandChanges({
        cancelledIds: cancelled,
        withdrawn: withdrawn.map((demandId) => ({ demandId, accepterId: userId })),
        actorId,
    });

    return { changes };
}


// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Supprime une occurrence d'équipe d'un utilisateur
 * @param {string} userId
 * @param {string} occurrenceId
 * @param {{ confirmed?: boolean, actorId?: string }} [opts]
 * @returns {Promise<{ changes: Array } | { needsApproval: true, segments, teams, changes: Array }>}
 */
export async function deleteTeamOccurrence (userId, occurrenceId, { confirmed = false, actorId } = {}) {
    return applyTeamChange(userId, (user) => {
        const after = user.teams.filter(t => !sameId(t._id, occurrenceId));

        if (user.teams.length === after.length) {
            throw new AppError('Occurrence non trouvée', 404);
        }

        return after;
    }, confirmed, actorId);
}

/**
 * Assigne une équipe à un utilisateur
 * @param {string} userId
 * @param {{ teamId: string, fromDate: string, toDate?: string }} newTeam
 * @param {{ confirmed?: boolean, replaceOccurrenceId?: string, actorId?: string }} [opts]
 *   replaceOccurrenceId : occurrence remplacée par la nouvelle, dans le même changement
 * @returns {Promise<{ changes: Array } | { needsApproval: true, segments, teams, changes: Array }>}
 */
export async function assignTeamToUser (userId, newTeam, { confirmed = false, replaceOccurrenceId, actorId } = {}) {
    if (!newTeam.teamId || !newTeam.fromDate) {
        throw new AppError('teamId and fromDate are required', 400);
    }

    const teamExists = await findOrThrow(Team, newTeam.teamId, { message: 'Équipe non trouvée' });
    return applyTeamChange(userId, (user) => {
        if (!sameId(teamExists.center, user.centerId)) {
            throw new AppError("Erreur dans la correspondance entre l'équipe et le centre", 400);
        }

        const kept = replaceOccurrenceId
            ? user.teams.filter(t => !sameId(t._id, replaceOccurrenceId))
            : [...user.teams];

        if (replaceOccurrenceId && kept.length === user.teams.length) {
            throw new AppError('Occurrence à remplacer non trouvée', 404);
        }

        return [...kept, {
            teamId: newTeam.teamId, fromDate: newTeam.fromDate, toDate: newTeam.toDate,
            fromDay: toDay(newTeam.fromDate), toDay: toDay(newTeam.toDate),
        }];
    }, confirmed, actorId);
}
