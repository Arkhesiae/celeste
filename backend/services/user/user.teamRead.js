import User from '../../models/User.js';
import Center from '../../models/Center.js';
import Team from '../../models/Team.js';
import { occurrenceDays } from '../../utils/dates/dayAccess.js';
import { toCalendarDay } from '../../utils/dates/calendarDay.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { findOrThrow } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import { getTeamAtDay } from '../team/team.atDay.js';

/**
 * Lecture des équipes d'un utilisateur et des membres d'un centre par équipe (les changements d'équipe sont dans
 * user.team.js, la frise dans user.teamTimeline.js).
 */

// { fromDay, toDay } d'une occurrence (jumeaux « jour », repli sur les anciens champs) pour les réponses d'API
// TEMPORARY(day-fields): ajoute fromDay/toDay aux sorties d'API pour le front ; inutile quand l'API ne renverra plus que les jumeaux (le front lit deja les deux).
const dayBounds = (occurrence) => { const { from, to } = occurrenceDays(occurrence); return { fromDay: from, toDay: to }; };

const getUserWithTeams = (userId) => findOrThrow(User, userId, { message: 'User not found', populate: 'teams' });

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

/** Équipe d'un utilisateur à une date (le jour est lu dans le fuseau de son centre) */
export async function getUserTeamAtDate (userId, date) {
    const user = await getUserWithTeams(userId);
    const day = toCalendarDay(date, await getCenterTimeZone(user.centerId));
    if (!day) throw new AppError('Date invalide', 400);
    return getTeamAtDate(user.teams, day);
}

/** Équipe d'un utilisateur aujourd'hui (jour du centre) */
export async function getUserCurrentTeam (userId) {
    const user = await getUserWithTeams(userId);
    return getTeamAtDate(user.teams, todayIn(await getCenterTimeZone(user.centerId)));
}

/**
 * Affectations d'équipe d'un utilisateur, classées : équipe permanente, renfort en cours, affectations à venir, toutes.
 * « Aujourd'hui » est le jour du centre ; les bornes des occurrences sont lues en jours (jumeau, repli signalé).
 */
export async function getUserTeamOccurrences (userId) {
    const user = await getUserWithTeams(userId);
    const today = todayIn(await getCenterTimeZone(user.centerId)).toString();
    const fromOf = (occurrence) => occurrenceDays(occurrence).from ?? '';
    const sortedOccurrences = [...user.teams].sort((a, b) => fromOf(a).localeCompare(fromOf(b)));

    const categorizedOccurrences = {
        permanentTeam: null,
        temporaryTeam: null,
        nextOccurrences: [],
        allOccurrences: []
    };

    for (const occurrence of sortedOccurrences) {
        const occurrenceObj = occurrence.toObject();
        const { from: startDay, to: endDay } = occurrenceDays(occurrence);
        const team = await Team.findById(occurrenceObj.teamId);

        if (!team || team.deleted) continue;

        const occurrenceWithTeam = {
            ...occurrenceObj,
            fromDay: startDay,
            toDay: endDay,
            teamName: team.name,
            type: endDay ? "Renfort" : "Changement"
        };

        if (startDay <= today && endDay && endDay >= today) {
            categorizedOccurrences.temporaryTeam = occurrenceWithTeam;
        }

        if (startDay <= today && !endDay) {
            categorizedOccurrences.permanentTeam = occurrenceWithTeam;
        }

        if (startDay > today) {
            categorizedOccurrences.nextOccurrences.push(occurrenceWithTeam);
        }

        categorizedOccurrences.allOccurrences.push(occurrenceWithTeam);
    }

    return categorizedOccurrences;
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
        // Occurrences d'équipes du centre, la plus récente d'abord
        const validOccurrences = user.teams
            .filter(occurrence => teamsMap.has(occurrence.teamId.toString()))
            .sort((a, b) => (occurrenceDays(b).from ?? '').localeCompare(occurrenceDays(a).from ?? ''));

        // Équipe permanente : la dernière affectation sans fin commencée à cette date
        const mainTeamOccurrence = validOccurrences.find(occurrence => {
            const { from, to } = occurrenceDays(occurrence);
            return !to && from <= dayKey;
        });

        if (mainTeamOccurrence) {
            const teamResult = resultMap.get(mainTeamOccurrence.teamId.toString());
            if (teamResult) teamResult.users.push(memberOf(user, mainTeamOccurrence));
        }

        // Renforts : les affectations bornées qui couvrent ce jour
        for (const occurrence of validOccurrences) {
            const { from, to } = occurrenceDays(occurrence);
            if (to) {
                const teamResult = resultMap.get(occurrence.teamId.toString());
                if (teamResult && from <= dayKey && to >= dayKey) teamResult.renforts.push(memberOf(user, occurrence));
            }
        }
    }

    return result;
}
