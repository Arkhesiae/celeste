import { occurrenceDays } from '../../utils/dates/dayAccess.js';
import { daysBetween, eachDay } from '../../utils/dates/plainDate.js';
import { fullName } from '../../utils/names.js';
import { sameId } from '../../utils/ids.js';
import { isValidDate } from '../../utils/validation.js';
import { TEAM_GRID_MAX_DAYS as MAX_DAYS } from '../../config/limits.js';
import Team from '../../models/Team.js';
import User from '../../models/User.js';
import Demand from '../../models/Demand.js';
import { Assignment } from '../../models/CalendarEntry.js';
import { AppError } from '../../error/AppError.js';
import { computeUserShifts } from '../planning/planning.userShifts.js';
import { createTeamShiftReader } from '../planning/planning.teamShift.js';
import { getTeamAtDay } from './team.atDay.js';

/**
 * Grille d'une équipe : pour chaque membre (permanent ou renfort) sur la période, la vacation ou l'entrée de calendrier de chaque
 * jour. `getTeamGrid` assemble ; chaque étape a sa fonction.
 */

/** Refuse une période qui n'est pas faite de deux jours existants, dans l'ordre, et assez courte (avant de lister ses jours) */
const assertGridPeriod = (startDate, endDate) => {
    // YYYY-MM-DD : l'ordre des chaînes est l'ordre chronologique
    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
        throw new AppError('Période invalide (YYYY-MM-DD)', 400);
    }
    if (daysBetween(startDate, endDate) + 1 > MAX_DAYS) {
        throw new AppError(`La période ne peut pas dépasser ${MAX_DAYS} jours`, 400);
    }
};

/**
 * Les utilisateurs qui sont dans l'équipe au moins un jour de la période, jour par jour (voir getTeamAtDay : un renfort ailleurs les
 * en sort ces jours-là). `isRenfort` : aucun de ces jours ne vient d'une affectation permanente.
 * @returns {Promise<Array<{ user: Object, inTeamDates: Set<string>, isRenfort: boolean }>>}
 */
const findGridMembers = async (team, dates) => {
    const users = await User.find({
        centerId: team.center,
        isActive: { $ne: false },
        'teams.teamId': team._id,
    }).select('name lastName teams').lean();

    return users.flatMap((user) => {
        const inTeamDates = new Set();
        let hasPermanentDay = false;
        for (const date of dates) {
            const occurrence = getTeamAtDay(user.teams, date);
            if (!occurrence || !sameId(occurrence.teamId, team._id)) continue;
            inTeamDates.add(date);
            if (!occurrenceDays(occurrence).to) hasPermanentDay = true;
        }
        return inTeamDates.size ? [{ user, inTeamDates, isRenfort: !hasPermanentDay }] : [];
    });
};

/**
 * La vacation « normale » de l'équipe chaque jour, affichée une seule fois dans l'en-tête de la grille. Un jour sans vacation (pas de
 * tour en vigueur, équipe sans position dans le cycle) est absent des deux résultats.
 * @returns {Promise<{ teamShifts: Object, shiftIdByDate: Map<string, string> }>}
 */
const readTeamShifts = async (team, dates) => {
    const readShift = createTeamShiftReader();
    const shifts = await Promise.all(dates.map((date) => readShift(team, date)));

    const teamShifts = {};
    const shiftIdByDate = new Map();
    shifts.forEach((shift, index) => {
        if (!shift) return;
        shiftIdByDate.set(dates[index], String(shift._id));
        teamShifts[dates[index]] = {
            name: shift.name,
            isRest: shift.type === 'rest',
            startTime: shift.default?.startTime ?? null,
            endTime: shift.default?.endTime ?? null,
        };
    });
    return { teamShifts, shiftIdByDate };
};

/**
 * Avec qui chaque membre a un remplacement ou une permutation, lu sur les entrées de calendrier de la période (la dernière du jour).
 * @returns {Promise<(userId, date: string) => ({ name: string, isSwitch: boolean } | null)>}
 */
const readCounterparts = async (userIds, dates) => {
    const assignments = await Assignment.find({
        userId: { $in: userIds }, date: { $in: dates }, active: true, subType: 'substitution', 'substitution.id': { $ne: null },
    }).select('userId date substitution.id createdAt').sort({ createdAt: 1 }).lean();

    const demands = await Demand.find({ _id: { $in: assignments.map((a) => a.substitution.id) } })
        .select('posterId accepterId accepterShift').lean();
    const demandById = new Map(demands.map((demand) => [String(demand._id), demand]));

    const people = await User.find({ _id: { $in: demands.flatMap((d) => [d.posterId, d.accepterId]).filter(Boolean) } })
        .select('name lastName').lean();
    const nameById = new Map(people.map((person) => [String(person._id), fullName(person)]));

    const keyOf = (userId, date) => `${userId}|${date}`;
    // Triées par création : la dernière entrée d'un jour remplace les précédentes
    const demandByUserDate = new Map(assignments.map((a) => [keyOf(a.userId, a.date), demandById.get(String(a.substitution.id))]));

    return (userId, date) => {
        const demand = demandByUserDate.get(keyOf(userId, date));
        if (!demand) return null;
        const otherId = sameId(demand.posterId, userId) ? demand.accepterId : demand.posterId;
        const name = otherId ? nameById.get(String(otherId)) : null;
        return name ? { name, isSwitch: Boolean(demand.accepterShift?.shift) } : null;
    };
};

/**
 * La case d'un jour d'un membre, ou `null` pour une case vide : un repos sans rien de particulier, ou la vacation habituelle de
 * l'équipe, déjà dans l'en-tête.
 * @param {Object} result - un jour de computeUserShifts
 * @param {{ counterpart: Object|null, usualShiftId: string|undefined }} context
 */
const toGridCell = (result, { counterpart, usualShiftId }) => {
    const shift = result.shiftData?.shift ?? null;
    // Un remplacé ne tient plus rien, mais la grille montre quelle vacation il a cédée
    const shownShift = shift ?? result.substitution?.gave?.shift ?? null;
    const isRest = !shownShift || shownShift.type === 'rest';
    const isEntry = !['shift', 'empty'].includes(result.type);   // entrée de calendrier (congé, stage, remplacement...)
    if (isRest && !isEntry && !counterpart) return null;

    const variation = result.shiftData?.selectedVariation;
    const isUsualShift = result.type === 'shift' && result.presence === 'present' && !variation && !result.wasPatched && !counterpart
        && String(shift?._id) === usualShiftId;
    if (isUsualShift) return null;

    return {
        date: result.date,
        type: result.type,
        shiftName: shownShift?.name ?? null,
        variation: typeof variation === 'object' ? variation?.name ?? null : variation ?? null,
        startTime: result.startTime ?? shift?.default?.startTime ?? null,
        endTime: result.endTime ?? shift?.default?.endTime ?? null,
        presence: result.presence,
        isRest,
        counterpart,
    };
};

/** La ligne d'un membre : ses cases non vides, les jours où il est dans l'équipe */
const buildMemberRow = async ({ user, isRenfort, inTeamDates }, { dates, shiftIdByDate, counterpartOf }) => {
    const days = (await computeUserShifts(dates, user._id))
        .filter((result) => inTeamDates.has(result.date))
        .map((result) => toGridCell(result, {
            counterpart: counterpartOf(user._id, result.date),
            usualShiftId: shiftIdByDate.get(result.date),
        }))
        .filter(Boolean);

    return { userId: user._id, name: user.name, lastName: user.lastName, isRenfort, inTeamDates: [...inTeamDates], days };
};

/** Les membres permanents d'abord, puis les renforts ; par nom */
const byRoleThenName = (a, b) => Number(a.isRenfort) - Number(b.isRenfort)
    || `${a.lastName}${a.name}`.localeCompare(`${b.lastName}${b.name}`);

/**
 * Grille d'une équipe sur une courte période (une vacation de nuit appartient au jour où elle commence).
 * @param {string} teamId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export async function getTeamGrid (teamId, startDate, endDate) {
    assertGridPeriod(startDate, endDate);

    const team = await Team.findById(teamId).select('name center cycleStartDate cycleOffset deleted').lean();
    if (!team || team.deleted) throw new AppError('Équipe non trouvée', 404);

    const dates = eachDay(startDate, endDate);
    const members = await findGridMembers(team, dates);
    const { teamShifts, shiftIdByDate } = await readTeamShifts(team, dates);
    const counterpartOf = await readCounterparts(members.map((member) => member.user._id), dates);

    const rows = await Promise.all(members.map((member) => buildMemberRow(member, { dates, shiftIdByDate, counterpartOf })));
    rows.sort(byRoleThenName);

    return { team: { _id: team._id, name: team.name }, startDate, endDate, teamShifts, members: rows };
}
