import User from '../../models/User.js';
import Team from '../../models/Team.js';
import { AppError } from '../../error/AppError.js';
import { Temporal } from '@js-temporal/polyfill';


// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr (date) {
    if (typeof date === 'string') return date.slice(0, 10);
    if (date instanceof Date) return date.toISOString().slice(0, 10);
    return date;
}

function getDistinctDates (items) {
    const dateSet = new Set();

    for (const item of items) {
        const fromDate = toDateStr(item.fromDate);
        const toDate = item.toDate ? toDateStr(item.toDate) : null;
        const start = Temporal.PlainDate.from(fromDate);
        dateSet.add(start.toString());

        if (toDate) {
            // temporaire : ajout du jour suivant pour que le dernier jour soit inclus
            const dayAfterEnd = Temporal.PlainDate.from(toDate).add({ days: 1 });
            dateSet.add(dayAfterEnd.toString());
        }
    }

    return [...dateSet].sort();
}

function findChangedPeriods (before, after) {
    const allDates = getDistinctDates([...before, ...after]);

    const getActiveTeam = (list, dateStr) => {
        const plainDate = Temporal.PlainDate.from(dateStr);
        const sortedList = [...list].sort((a, b) =>
            Temporal.PlainDate.compare(
                Temporal.PlainDate.from(toDateStr(b.fromDate)),
                Temporal.PlainDate.from(toDateStr(a.fromDate))
            )
        );

        const bounded = sortedList.filter(a =>
            a.toDate &&
            Temporal.PlainDate.compare(Temporal.PlainDate.from(toDateStr(a.fromDate)), plainDate) <= 0 &&
            Temporal.PlainDate.compare(Temporal.PlainDate.from(toDateStr(a.toDate)), plainDate) >= 0
        );

        if (bounded.length > 0) return bounded[0].teamId?.toString() || null;

        const openEnded = sortedList.filter(a =>
            !a.toDate &&
            Temporal.PlainDate.compare(Temporal.PlainDate.from(toDateStr(a.fromDate)), plainDate) <= 0
        );

        return openEnded[0]?.teamId?.toString() || null;
    };

    const changes = [];

    for (let i = 0; i < allDates.length; i++) {
        const date = allDates[i];
        const nextDateStr = allDates[i + 1] ?? null;

        const oldTeam = getActiveTeam(before, date);
        const newTeam = getActiveTeam(after, date);

        if (oldTeam === newTeam) continue;

        const last = changes.at(-1);

        if (last && last.oldTeam === oldTeam && last.newTeam === newTeam && last.to === allDates[i]) {
            last.to = nextDateStr;
        } else {
            changes.push({ from: allDates[i], to: nextDateStr, oldTeam, newTeam });
        }
    }
    
    return changes;
}


// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Supprime une occurrence d'équipe d'un utilisateur
 * @param {string} userId
 * @param {string} occurrenceId
 * @returns {Promise<{ changes: Array }>}
 */
export async function deleteTeamOccurrence (userId, occurrenceId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    const before = user.teams;
    const after = user.teams.filter(t => t._id.toString() !== occurrenceId);

    if (before.length === after.length) {
        throw new AppError('Occurrence non trouvée', 404);
    }


    const changes = findChangedPeriods(before, after);
    if (changes.length) {
        cancelModification(changes)
        cancelSubstitution(changes)
    }

    user.teams = after;
    await user.save();

    return { changes };
}

/**
 * Assigne une équipe à un utilisateur
 * @param {string} userId
 * @param {{ teamId: string, fromDate: string, toDate?: string }} newTeam
 * @returns {Promise<{ changes: Array }>}
 */
export async function assignTeamToUser (userId, newTeam) {
    if (!newTeam.teamId || !newTeam.fromDate) {
        throw new AppError('teamId and fromDate are required', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    const teamExists = await Team.findById(newTeam.teamId);
    if (!teamExists) {
        throw new AppError('Équipe non trouvée', 404);
    }

    if (teamExists.center.toString() !== user.centerId.toString()) {
        throw new AppError("Erreur dans la correspondance entre l'équipe et le centre", 400);
    }


    const before = user.teams;
    const after = [...user.teams, newTeam];
    const changes = findChangedPeriods(before, after);
    if (changes.length) {
        cancelModification(changes)
        cancelSubstitution(changes)
    }

    user.teams.push({ teamId: newTeam.teamId, fromDate: newTeam.fromDate, toDate: newTeam.toDate });
    await user.save();

    return { changes };
}


const cancelModificationEntries = (changes) => {
    for (const change of changes) {
        const modifications = Modification.find({ userId: userId, active: true, date: { $gte: change.from, $lte: change.to } })
        console.log
    }
}

const cancelSubstitutionEntries = (changes) => {
    
}

