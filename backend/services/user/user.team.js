import mongoose from 'mongoose';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import { AppError } from '../../error/AppError.js';
import { buildTeamSegments, diffTeamSegments } from '../../utils/teamSegments.js';
import { previewUserPeriodImpact, sanitizeUserPeriod } from './user.sanitizePeriod.js';


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

    for (const { from, to } of changes) {
        await sanitizeUserPeriod(user._id, { from, to }, { session });
    }

    user.teams = afterTeams;
    await user.save({ session });

    return changes;
}

async function inTransaction (fn) {
    const session = await mongoose.startSession();
    try {
        return await session.withTransaction(() => fn(session));
    } finally {
        session.endSession();
    }
}

/**
 * Applique un changement d'équipe : sans `confirmed`, retourne une demande d'approbation si des demandes
 * ou entrées de calendrier seraient affectées ; sinon (ou une fois confirmé) l'applique en transaction.
 * @param {string} userId
 * @param {(user) => Array} computeAfter - occurrences après changement (peut lever une AppError)
 * @param {boolean} confirmed
 */
async function applyTeamChange (userId, computeAfter, confirmed) {
    if (!confirmed) {
        const user = await User.findById(userId);
        if (!user) throw new AppError('Utilisateur non trouvé', 404);

        const plan = planTeamChange(user, computeAfter(user));
        const approval = await buildApprovalRequest(user, plan);
        if (approval) return approval;
    }

    const changes = await inTransaction(async (session) => {
        const user = await User.findById(userId).session(session);
        if (!user) throw new AppError('Utilisateur non trouvé', 404);

        return sanitizeAndSaveTeams(user, computeAfter(user), session);
    });

    return { changes };
}


// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Supprime une occurrence d'équipe d'un utilisateur
 * @param {string} userId
 * @param {string} occurrenceId
 * @param {{ confirmed?: boolean }} [opts]
 * @returns {Promise<{ changes: Array } | { needsApproval: true, segments, teams, changes: Array }>}
 */
export async function deleteTeamOccurrence (userId, occurrenceId, { confirmed = false } = {}) {
    return applyTeamChange(userId, (user) => {
        const after = user.teams.filter(t => t._id.toString() !== occurrenceId);

        if (user.teams.length === after.length) {
            throw new AppError('Occurrence non trouvée', 404);
        }

        return after;
    }, confirmed);
}

/**
 * Assigne une équipe à un utilisateur
 * @param {string} userId
 * @param {{ teamId: string, fromDate: string, toDate?: string }} newTeam
 * @param {{ confirmed?: boolean, replaceOccurrenceId?: string }} [opts]
 *   replaceOccurrenceId : occurrence remplacée par la nouvelle, dans le même changement
 * @returns {Promise<{ changes: Array } | { needsApproval: true, segments, teams, changes: Array }>}
 */
export async function assignTeamToUser (userId, newTeam, { confirmed = false, replaceOccurrenceId } = {}) {
    if (!newTeam.teamId || !newTeam.fromDate) {
        throw new AppError('teamId and fromDate are required', 400);
    }

    const teamExists = await Team.findById(newTeam.teamId);
    if (!teamExists) {
        throw new AppError('Équipe non trouvée', 404);
    }

    return applyTeamChange(userId, (user) => {
        if (teamExists.center.toString() !== user.centerId.toString()) {
            throw new AppError("Erreur dans la correspondance entre l'équipe et le centre", 400);
        }

        const kept = replaceOccurrenceId
            ? user.teams.filter(t => t._id.toString() !== replaceOccurrenceId)
            : [...user.teams];

        if (replaceOccurrenceId && kept.length === user.teams.length) {
            throw new AppError('Occurrence à remplacer non trouvée', 404);
        }

        return [...kept, { teamId: newTeam.teamId, fromDate: newTeam.fromDate, toDate: newTeam.toDate }];
    }, confirmed);
}
