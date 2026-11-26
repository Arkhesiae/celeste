import User from '../../models/User.js';
import Center from '../../models/Center.js';
import Team from '../../models/Team.js';
import { occurrenceDays } from '../../utils/dates/dayAccess.js';
import { toCalendarDay } from '../../utils/dates/calendarDay.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { findOrThrow } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import { getTeamAtDay, withDays, permanentAt, reinforcementsAt } from '../team/team.atDay.js';

/**
 * Lecture des équipes d'un utilisateur et des membres d'un centre par équipe (les changements d'équipe sont dans
 * user.team.js, la frise dans user.teamTimeline.js).
 */

// { fromDay, toDay } d'une occurrence (jumeaux « jour », repli sur les anciens champs) pour les réponses d'API
// TEMPORARY(day-fields): ajoute fromDay/toDay aux sorties d'API pour le front ; inutile quand l'API ne renverra plus que les jumeaux (le front lit deja les deux).
const dayBounds = (occurrence) => { const { from, to } = occurrenceDays(occurrence); return { fromDay: from, toDay: to }; };

const getUserWithTeams = (userId) => findOrThrow(User, userId, { message: 'User not found' });

/** Occurrence d'équipe d'un jour, avec le nom de l'équipe et son type (renfort ou changement) */
const getTeamAtDate = async (teams, day) => {
    const teamOccurrence = getTeamAtDay(teams, day);
    if (!teamOccurrence) {
        throw new AppError('No team found for the given date', 404);
    }

    const team = await Team.findById(teamOccurrence.teamId);
    if (!team || team.deleted) {
        throw new AppError('Team not found', 404);
    }
    return {
        ...teamOccurrence.toObject(),
        name: team.name,
        cycleStartDate: team.cycleStartDate,
        type: occurrenceDays(teamOccurrence).to ? "Renfort" : "Changement"
    };
};

/** Équipe d'un utilisateur aujourd'hui (jour du centre) */
export async function getUserCurrentTeam (userId) {
    const user = await getUserWithTeams(userId);
    return getTeamAtDate(user.teams, todayIn(await getCenterTimeZone(user.centerId)));
}

/** Le nom de chaque équipe non supprimée parmi celles de ces occurrences, en une seule lecture : id (chaîne) -> nom */
const readTeamNames = async (occurrences) => {
    const teams = await Team.find({
        _id: { $in: occurrences.map((occurrence) => occurrence.teamId).filter(Boolean) },
        deleted: { $ne: true },
    }).select('name');
    return new Map(teams.map((team) => [String(team._id), team.name]));
};

/**
 * Affectations d'équipe d'un utilisateur : l'équipe permanente et le renfort d'aujourd'hui (jour du centre), les affectations à
 * venir, et toutes, de la plus ancienne à la plus récente. « Aujourd'hui » suit la même règle que le planning (`permanentAt`,
 * `reinforcementsAt` de team.atDay.js) : un renfort ne retire pas l'équipe permanente, il s'ajoute (`temporaryTeam`).
 * Les occurrences d'une équipe supprimée ne sont pas listées, ni la marque « sans équipe », qui met fin à l'équipe permanente.
 */
export async function getUserTeamOccurrences (userId) {
    const user = await getUserWithTeams(userId);
    const today = todayIn(await getCenterTimeZone(user.centerId)).toString();
    const teamNames = await readTeamNames(user.teams);

    const listed = withDays(user.teams).filter(({ teamId }) => teamId === null || teamNames.has(String(teamId)));
    const assignments = listed.filter(({ teamId }) => teamId !== null);

    const describe = ({ occurrence, teamId, from, to }) => ({
        ...occurrence.toObject(),
        fromDay: from,
        toDay: to,
        teamName: teamNames.get(String(teamId)),
        type: to ? "Renfort" : "Changement"
    });

    const permanent = permanentAt(listed, today);
    const reinforcement = reinforcementsAt(assignments, today)[0];
    const allOccurrences = [...assignments]
        .sort((first, second) => (first.from ?? '').localeCompare(second.from ?? ''))
        .map(describe);

    return {
        permanentTeam: permanent?.teamId ? describe(permanent) : null,
        temporaryTeam: reinforcement ? describe(reinforcement) : null,
        nextOccurrences: allOccurrences.filter((occurrence) => occurrence.fromDay > today),
        allOccurrences
    };
}

/**
 * Membres d'un centre rangés par équipe, à une date (aujourd'hui dans le fuseau du centre par défaut) : les membres
 * permanents (`users`) et les renforts du jour (`renforts`).
 * @param {string} centerId
 * @param {string} [requestedDate] - date demandée ; 400 si elle est invalide
 */
export async function getUsersGroupedByTeam (centerId, requestedDate) {
    if (requestedDate && !toCalendarDay(requestedDate)) {
        throw new AppError('Format de date invalide', 400);
    }

    if (!centerId) {
        throw new AppError('ID du centre requis', 400);
    }

    const [center, teams, users] = await Promise.all([
        Center.findById(centerId),
        Team.find({ center: centerId }),
        User.find({ centerId })
    ]);

    if (!center) {
        throw new AppError('Centre non trouvé', 404);
    }

    const day = requestedDate ? toCalendarDay(requestedDate, center.timeZone) : todayIn(center.timeZone);
    const dayKey = day.toString();

    const teamsMap = new Map(teams.map(team => [team._id.toString(), team]));

    const result = teams.map(team => ({
        teamId: team._id,
        teamName: team.name,
        users: [],
        renforts: []
    }));
    const resultMap = new Map(result.map(team => [team.teamId.toString(), team]));

    const memberOf = (user, occurrence) => ({
        userId: user._id,
        name: user.name,
        lastName: user.lastName,
        fromDate: occurrence.fromDate,
        toDate: occurrence.toDate,
        ...dayBounds(occurrence)
    });

    for (const user of users) {
        // Occurrences d'équipes du centre et fins d'appartenance : un utilisateur revenu dans un centre ne retrouve pas l'équipe
        // qu'il y avait avant de le quitter
        const items = withDays(user.teams)
            .filter(({ teamId }) => teamId === null || teamsMap.has(String(teamId)));

        // Ici, à la différence de `getTeamAtDay`, un renfort ne retire pas l'utilisateur de son équipe permanente : il figure dans
        // celle-ci (`users`) et dans chaque équipe qu'il renforce ce jour (`renforts`)
        const permanent = permanentAt(items, dayKey);
        if (permanent?.teamId) {
            resultMap.get(String(permanent.teamId))?.users.push(memberOf(user, permanent.occurrence));
        }

        for (const { teamId, occurrence } of reinforcementsAt(items, dayKey)) {
            if (teamId) resultMap.get(String(teamId))?.renforts.push(memberOf(user, occurrence));
        }
    }

    return result;
}
