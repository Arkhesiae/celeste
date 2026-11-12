import { Temporal } from '@js-temporal/polyfill';
import { occurrenceDays } from '../../utils/dates/dayAccess.js';
import { eachDay, toMongoDate } from '../../utils/dates/plainDate.js';
import { fullName } from '../../utils/names.js';
import { sameId } from '../../utils/ids.js';
import Team from '../../models/Team.js';
import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { Assignment } from '../../models/CalendarEntry.js';
import { computeUserShifts } from '../planning/computeUserShifts.js';
import { computeShiftOfTeam } from '../planning/computeShiftOfTeam.js';
import { getTeamAtDay } from './team.atDay.js';

import { AppError } from '../../error/AppError.js';
import { isValidDate } from '../../utils/validation.js';


import { TEAM_GRID_MAX_DAYS as MAX_DAYS } from '../../config/limits.js';
/**
 * Grille d'une équipe : pour chaque membre (permanent ou renfort) sur la période, la vacation ou l'entrée
 * de calendrier de chaque jour (une vacation de nuit appartient au jour où elle commence).
 * @param {string} teamId
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export async function getTeamGrid (teamId, startDate, endDate) {
    if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {   // YYYY-MM-DD : l'ordre des chaînes est l'ordre chronologique
        throw new AppError('Période invalide (YYYY-MM-DD)', 400);
    }
    for (const key of [startDate, endDate]) {
        try { Temporal.PlainDate.from(key); } catch { throw new AppError('Période invalide (YYYY-MM-DD)', 400); }
    }
    if (eachDay(startDate, endDate).length > MAX_DAYS) {
        throw new AppError(`La période ne peut pas dépasser ${MAX_DAYS} jours`, 400);
    }

    const team = await Team.findById(teamId).select('name center cycleStartDate cycleOffset deleted').lean();
    if (!team || team.deleted) throw new AppError('Équipe non trouvée', 404);

    const dates = eachDay(startDate, endDate);

    const users = await User.find({
        centerId: team.center,
        isActive: { $ne: false },
        'teams.teamId': team._id,
    }).select('name lastName teams').lean();

    // Appartenance jour par jour : l'équipe effective d'un utilisateur un jour donné (un renfort l'emporte sur
    // l'équipe permanente). Un membre n'apparaît que s'il fait partie de l'équipe au moins un jour de la période.
    const members = [];
    for (const user of users) {
        const inTeamDates = new Set();
        let hasPermanentDay = false;
        for (const date of dates) {
            const occurrence = getTeamAtDay(user.teams, Temporal.PlainDate.from(date));
            if (occurrence && sameId(occurrence.teamId, team._id)) {
                inTeamDates.add(date);
                if (!occurrenceDays(occurrence).to) hasPermanentDay = true;
            }
        }
        if (inTeamDates.size === 0) continue;
        members.push({ user, inTeamDates, isRenfort: !hasPermanentDay });
    }

    // Vacation « normale » de l'équipe pour chaque jour : affichée une seule fois dans l'en-tête de la grille
    const teamShiftList = await Promise.all(dates.map(async (date) => {
        // Null si l'équipe n'a pas de début de cycle
        return [date, await computeShiftOfTeam(toMongoDate(Temporal.PlainDate.from(date)), team)];
    }));
    const teamShifts = {};
    const teamShiftIds = new Map();
    for (const [date, shift] of teamShiftList) {
        if (!shift) continue;
        teamShiftIds.set(date, String(shift._id));
        teamShifts[date] = {
            name: shift.name,
            isRest: shift.type === 'rest',
            startTime: shift.default?.startTime ?? null,
            endTime: shift.default?.endTime ?? null,
        };
    }

    // Contrepartie des remplacements / permutations, lue sur les entrées de calendrier de la période
    const userIds = members.map((m) => m.user._id);
    const assignments = await Assignment.find({
        userId: { $in: userIds }, date: { $in: dates }, active: true, subType: 'substitution', 'substitution.id': { $ne: null },
    }).select('userId date substitution.id createdAt').sort({ createdAt: 1 }).lean();

    const substitutions = await Substitution.find({ _id: { $in: assignments.map((a) => a.substitution.id) } })
        .select('posterId accepterId accepterShift').lean();
    const subById = new Map(substitutions.map((s) => [String(s._id), s]));

    const counterpartIds = new Set();
    for (const s of substitutions) {
        if (s.posterId) counterpartIds.add(String(s.posterId));
        if (s.accepterId) counterpartIds.add(String(s.accepterId));
    }
    const counterpartUsers = await User.find({ _id: { $in: [...counterpartIds] } }).select('name lastName').lean();
    const nameById = new Map(counterpartUsers.map((u) => [String(u._id), fullName(u)]));

    // Dernière entrée de remplacement par (utilisateur, jour)
    const subByUserDate = new Map();
    for (const a of assignments) subByUserDate.set(`${a.userId}|${a.date}`, subById.get(String(a.substitution.id)));

    const counterpartOf = (userId, date) => {
        const sub = subByUserDate.get(`${userId}|${date}`);
        if (!sub) return null;
        const isPoster = sameId(sub.posterId, userId);
        const otherId = isPoster ? sub.accepterId : sub.posterId;
        const name = otherId ? nameById.get(String(otherId)) : null;
        if (!name) return null;
        return { name, isSwitch: Boolean(sub.accepterShift?.shift) };
    };

    const rows = await Promise.all(members.map(async ({ user, isRenfort, inTeamDates }) => {
        const shifts = await computeUserShifts(dates, user._id);
        const days = [];

        for (const r of shifts) {
            if (!inTeamDates.has(r.date)) continue;   // jour où il n'est pas dans cette équipe : pas de cellule
            const shift = r.shiftData?.shift ?? null;
            const isRest = !shift || shift.type === 'rest';
            const isEntry = !['shift', 'empty'].includes(r.type);   // entrée de calendrier (congé, stage, remplacement...)
            const counterpart = counterpartOf(user._id, r.date);
            // Journée de repos sans rien de particulier : cellule vide
            if (isRest && !isEntry && !counterpart) continue;

            const variation = r.shiftData?.selectedVariation;
            // Vacation habituelle de l'équipe, sans rien de particulier : déjà dans l'en-tête, cellule vide
            const isUsualShift = r.type === 'shift' && !r.isOff && !variation && !r.wasPatched && !counterpart
                && String(shift?._id) === teamShiftIds.get(r.date);
            if (isUsualShift) continue;

            days.push({
                date: r.date,
                type: r.type,
                shiftName: shift?.name ?? null,
                variation: typeof variation === 'object' ? variation?.name ?? null : variation ?? null,
                startTime: r.startTime ?? shift?.default?.startTime ?? null,
                endTime: r.endTime ?? shift?.default?.endTime ?? null,
                isOff: Boolean(r.isOff),
                isRest,
                counterpart,
            });
        }

        return { userId: user._id, name: user.name, lastName: user.lastName, isRenfort, inTeamDates: [...inTeamDates], days };
    }));

    rows.sort((a, b) => Number(a.isRenfort) - Number(b.isRenfort)
        || `${a.lastName}${a.name}`.localeCompare(`${b.lastName}${b.name}`));

    return { team: { _id: team._id, name: team.name }, startDate, endDate, teamShifts, members: rows };
}
