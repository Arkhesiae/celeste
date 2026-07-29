import Team from '../models/Team.js';
import { computeShiftOfTeam } from "./computeShiftOfTeam.js";
import { getTeamAtGivenDate } from "./getTeamAtGivenDate.js";
import User from "../models/User.js";
import Substitution from '../models/Substitution.js';
import { CalendarEntry, Assignment, Modification, HourPatch } from '../models/CalendarEntry.js';
import Shift from '../models/Shift.js';
import Center from '../models/Center.js';
import Rotation from '../models/Rotation.js';
import { findLatestRotation } from './findLatestRotation.js';



/**
 * Récupère le shift initial d'un utilisateur à une date donnée
 * @param {Date} date - La date pour laquelle on souhaite récupérer le shift
 * @param {string} teamId - L'ID de l'équipe
 * @returns {Promise<Object>} - Un objet contenant le shift initial, l'équipe et la variation sélectionnée
 */
const getBaseShift = async (date, user) => {
    let team = null;
    let baseShift = null;

    if (user.teams?.length === 0) {
        team = null;
    } else {
        team = getTeamAtGivenDate(user.teams, date);
    }

    if (team) {
        baseShift = await computeShiftOfTeam(date, team.teamId);
    } else {
        baseShift = null;
    }

    return { baseShift, team: team?.teamId };
}


// ── Utilitaires temps ─────────────────────────────────────────────────

const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number)
    return h * 60 + m
}

const toTime = (minutes) => {
    const total = ((minutes % 1440) + 1440) % 1440
    const h = Math.floor(total / 60).toString().padStart(2, '0')
    const m = (total % 60).toString().padStart(2, '0')
    return `${h}:${m}`
}

const addHours = (time, hours) => toTime(toMinutes(time) + Math.round(hours * 60))

// ── Cohérence ─────────────────────────────────────────────────────────

const checkHourPatchCoherence = (latestModification) => {
    if (latestModification?.subType === 'absence') {
        throw new Error('hourPatch incohérent : le shift est annulé (absence)')
    }
}

const isSameShift = (resolvedShift, entry) =>
    resolvedShift?.shiftData?.shift?._id?.equals(entry?.shiftData?.shift?._id);

const isModificationConsistent = (latestModification, resolvedShift) => isSameShift(resolvedShift, latestModification);

const checkBaseShiftCoherence = (baseShift, latestAssignment) => {
    if (!baseShift) {
        console.error('baseShift incohérent : aucun shift de base résolu')
        return false
    }

    if (latestAssignment?.baseShift?.shift._id.toString() !== baseShift.shift._id.toString()) {
        console.error('baseShift incohérent : le shift de base a changé')
        return false
    }
    return true
}

// ── Résolution ────────────────────────────────────────────────────────

const buildAssignmentHistory = (assignments) =>
    assignments.map((a) => ({
        type: a.subType,
        shiftData: a.shiftData,
        wasOverride: a.wasOverride,
    }))

const applyEntries = (baseShift, assignments, modifications, hoursPatches) => {
    const latestAssignment = assignments.at(-1) ?? null
    const latestModification = modifications.at(-1) ?? null
    const latestHourPatch = hoursPatches.at(-1) ?? null

    let resolvedShift = resolveAssignment(baseShift, latestAssignment)

    if (isModificationConsistent(latestModification, resolvedShift)) {
        resolvedShift = applyModification(resolvedShift, latestModification)
    }

    if (!resolvedShift.isOff) checkHourPatchCoherence(latestModification)
    resolvedShift = applyHourPatch(resolvedShift, latestHourPatch)

    return { resolvedShift, assignmentHistory: buildAssignmentHistory(assignments) }
}

const resolveAssignment = (baseShift, latestAssignment) => {
    if (!latestAssignment) {
        return buildShiftResult(null, baseShift.shift, baseShift.team, baseShift)
    }

    // Accepteur d'un rempla / assignation avec vacation concrète
    if (latestAssignment.shiftData?.shift) {
        return buildShiftResult(null, latestAssignment.shiftData.shift, latestAssignment.shiftData.team, baseShift, {
            isBaseShift: false,
            isOff: false,
            shiftData: latestAssignment.shiftData,
        })
    }

    // Poster remplacé (shiftData null) ou absence : plus en poste, mais on conserve
    // la vacation de base pour l'affichage (J4 + état off / remplacé).
    const freedBySub = latestAssignment.subType === 'substitution'
    const isAbsence = latestAssignment.subType === 'absence'

    return {
        type: latestAssignment.subType,
        isBaseShift: false,
        isOff: freedBySub || isAbsence,
        shiftData: {
            shift: baseShift?.shift ?? null,
            selectedVariation: null,
            team: baseShift?.team ?? null,
        },
        startTime: latestAssignment.startTime ?? null,
        endTime: latestAssignment.endTime ?? null,
        baseShift,
    }
}


const applyModification = (resolvedShift, latestModification) => {
    if (!latestModification) return resolvedShift

    const modShiftData = latestModification.shiftData

    switch (latestModification.subType) {
        case 'variation':
            return {
                ...resolvedShift,
                shiftData: {
                    ...resolvedShift.shiftData,
                    selectedVariation: modShiftData.selectedVariation,
                    team: modShiftData.team ?? resolvedShift.shiftData.team,
                },
                startTime: modShiftData.selectedVariation.startTime,
                endTime: modShiftData.selectedVariation.endTime,
            }
        case 'vic':
            return {
                ...resolvedShift,
                shiftData: {
                    ...resolvedShift.shiftData,
                    selectedVariation: 'vic',
                    team: modShiftData.team ?? resolvedShift.shiftData.team,
                },
            }
        case 'disp':
            return {
                ...resolvedShift,
                isOff: true,
                shiftData: {
                    ...resolvedShift.shiftData,
                    selectedVariation: 'disp',
                    team: modShiftData.team ?? resolvedShift.shiftData.team,
                },
            }
        case 'pres':
            return {
                ...resolvedShift,
                isOff: false,
                shiftData: {
                    ...resolvedShift.shiftData,
                    selectedVariation: null,
                    team: modShiftData.team ?? resolvedShift.shiftData.team,
                },
            }
        default:
            return resolvedShift
    }



}

const applyHourPatch = (resolvedShift, latestHourPatch) => {
    if (!latestHourPatch || resolvedShift.isOff) return resolvedShift
    return {
        ...resolvedShift,
        wasPatched: true,
        startTime: addHours(resolvedShift.startTime, latestHourPatch.adjustedTime.adjustedStart),
        endTime: addHours(resolvedShift.endTime, latestHourPatch.adjustedTime.adjustedEnd),
    }
}

const getActiveEntries = async (user, date) => {
    const populateShiftData = (query) => query
        .populate({ path: 'shiftData', populate: 'shift' })
        .populate({ path: 'shiftData.shift', populate: 'variations' })
        .populate({ path: 'shiftData.selectedVariation' })
        .populate({ path: 'shiftData.team' });

    const baseQuery = { userId: user._id, active: true, date, };

    const [assignments, modifications, hoursPatches] = await Promise.all([
        populateShiftData(Assignment.find({ ...baseQuery })).sort({ createdAt: 1 }).lean(),
        populateShiftData(Modification.find({ ...baseQuery })).sort({ createdAt: 1 }).lean(),
        HourPatch.find({ ...baseQuery }).sort({ createdAt: 1 }).lean(),
    ]);

    return { assignments, modifications, hoursPatches };
}

/** Charge toutes les entries actives sur une plage de dates, groupées par jour */
const getActiveEntriesByDates = async (user, dateStrs) => {
    const populateShiftData = (query) => query
        .populate({ path: 'shiftData', populate: 'shift' })
        .populate({ path: 'shiftData.shift', populate: 'variations' })
        .populate({ path: 'shiftData.selectedVariation' })
        .populate({ path: 'shiftData.team' });

    const baseQuery = { userId: user._id, active: true, date: { $in: dateStrs } };

    const [assignments, modifications, hoursPatches] = await Promise.all([
        populateShiftData(Assignment.find(baseQuery)).sort({ createdAt: 1 }).lean(),
        populateShiftData(Modification.find(baseQuery)).sort({ createdAt: 1 }).lean(),
        HourPatch.find(baseQuery).sort({ createdAt: 1 }).lean(),
    ]);

    const byDate = Object.fromEntries(dateStrs.map((d) => [d, {
        assignments: [],
        modifications: [],
        hoursPatches: [],
    }]));

    for (const a of assignments) {
        const key = typeof a.date === 'string' ? a.date.slice(0, 10) : a.date;
        if (byDate[key]) byDate[key].assignments.push(a);
    }
    for (const m of modifications) {
        const key = typeof m.date === 'string' ? m.date.slice(0, 10) : m.date;
        if (byDate[key]) byDate[key].modifications.push(m);
    }
    for (const h of hoursPatches) {
        const key = typeof h.date === 'string' ? h.date.slice(0, 10) : h.date;
        if (byDate[key]) byDate[key].hoursPatches.push(h);
    }

    return byDate;
}

const buildShiftResult = (dateStr, shift, team, baseShift, overrides = {}) => ({
    date: dateStr,
    type: shift ? 'shift' : "empty",
    isBaseShift: true,
    shiftData: { shift, selectedVariation: null, team: team },
    startTime: shift?.default?.startTime,
    endTime: shift?.default?.endTime,
    baseShift,
    ...overrides,
})

/**
 * Récupère le shift d'un utilisateur à une date donnée en prenant en compte les substitutions et modifications de planning
 * @param {Array} dates - Les dates pour lesquelles on souhaite récupérer le shift
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Array>} - Un tableau des shifts de l'utilisateur
 */
const computeUserShifts = async (dates, userId) => {
    try {
        const user = await User.findById(userId).populate([
            { path: 'teams.teamId' }
        ]);

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const dateArray = Array.isArray(dates) ? dates : [dates];
        const normalizedDates = dateArray.map((rawDate) => {
            const date = new Date(rawDate);
            if (isNaN(date.getTime())) {
                throw new Error(`Date invalide: ${rawDate}`);
            }
            return {
                date,
                dateStr: date.toISOString().split('T')[0],
            };
        });

        const entriesByDate = await getActiveEntriesByDates(
            user,
            normalizedDates.map((d) => d.dateStr)
        );

        // Une rotation peuplée par équipe (évite N× aggregate + populate)
        const rotationByTeamId = new Map();
        const getPopulatedRotation = async (team, date) => {
            const teamId = team._id?.toString?.() || String(team);
            if (rotationByTeamId.has(teamId)) return rotationByTeamId.get(teamId);

            const center = await Center.findById(team.center);
            if (!center) {
                rotationByTeamId.set(teamId, null);
                return null;
            }

            let latestRotation = await findLatestRotation(center._id, date);
            if (!latestRotation) {
                rotationByTeamId.set(teamId, null);
                return null;
            }

            if (latestRotation.days?.length > 0) {
                const firstDay = latestRotation.days[0];
                const needsPopulate = typeof firstDay === 'string' ||
                    firstDay?.constructor?.name === 'ObjectId' ||
                    firstDay?.constructor?.name === 'ObjectID' ||
                    !firstDay?.default;
                if (needsPopulate) {
                    latestRotation = await Rotation.findById(latestRotation._id).populate({
                        path: 'days',
                        populate: { path: 'variations' }
                    });
                }
            }

            rotationByTeamId.set(teamId, latestRotation);
            return latestRotation;
        };
        const shiftFromRotation = (team, date, rotation) => {
            if (!rotation?.days?.length) return null;
            const diffInDays = Math.floor(
                (date - new Date(team.cycleStartDate)) / (1000 * 60 * 60 * 24)
            );
            const total = rotation.days.length;
            const dayIndex = diffInDays >= 0
                ? diffInDays % total
                : (total - (Math.abs(diffInDays) % total)) % total;
            return rotation.days[dayIndex] || null;
        };

        const results = await Promise.all(
            normalizedDates.map(async ({ date, dateStr }) => {
                const teamOcc = user.teams?.length ? getTeamAtGivenDate(user.teams, date) : null;
                const team = teamOcc?.teamId ?? null;

                let baseShift = null;
                if (team) {
                    // Utilise la date max du batch pour résoudre la rotation active
                    const pivotDate = normalizedDates[normalizedDates.length - 1].date;
                    const rotation = await getPopulatedRotation(team, pivotDate);
                    baseShift = shiftFromRotation(team, date, rotation);
                }

                const { assignments, modifications, hoursPatches } = entriesByDate[dateStr]
                    || { assignments: [], modifications: [], hoursPatches: [] };

                if (!assignments.length && !modifications.length && !hoursPatches.length) {
                    return buildShiftResult(dateStr, baseShift, team, baseShift, {
                        isOff: Boolean(baseShift?.optional),
                    });
                }

                const { resolvedShift, assignmentHistory } = applyEntries(
                    { shift: baseShift, team },
                    assignments,
                    modifications,
                    hoursPatches
                );

                return { ...resolvedShift, date: dateStr, history: assignmentHistory, baseShift };
            })
        );
        return results;
    } catch (error) {
        console.error('Erreur dans le calcul des vacations : ', error.message);
        throw error;
    }
};

const computeShiftOfUserWithoutSubstitutions = async (dates, userId) => {
    try {
        const user = await User.findById(userId).populate('teams');
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const dateArray = Array.isArray(dates) ? dates : [dates];
        const results = await Promise.all(
            dateArray.map(async (dateStr) => {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    throw new Error(`Date invalide: ${dateStr}`);
                }

                const team = await getTeamAtGivenDate(user.teams, date);
                if (!team) {
                    return {
                        date: dateStr,
                        status: "Pas d'équipe"
                    };
                }

                const teamObject = await Team.findById(team.teamId);
                if (!teamObject) {
                    throw new Error(`Équipe non trouvée pour l'ID: ${team.teamId}`);
                }

                const shift = await computeShiftOfTeam(date, team.teamId);
                return {
                    date: dateStr,
                    teamObject,
                    shift
                };
            })
        );


        return results;
    }
    catch (error) {
        console.error('Erreur dans le calculs des vacations : ', error.message);
        throw error;
    }
}

export { computeUserShifts, computeShiftOfUserWithoutSubstitutions }; 