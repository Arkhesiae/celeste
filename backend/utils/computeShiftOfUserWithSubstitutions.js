import Team from '../models/Team.js';
import { computeShiftOfTeam } from "./computeShiftOfTeam.js";
import { getTeamAtGivenDate } from "./getTeamAtGivenDate.js";
import User from "../models/User.js";
import Substitution from '../models/Substitution.js';
import { CalendarEntry, Assignment, Modification, HourPatch } from '../models/CalendarEntry.js';
import Shift from '../models/Shift.js';



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

const checkModificationCoherence = (latestModification, resolvedShift) => {
    const needsShift = ['variation', 'vic'].includes(latestModification?.subType)
    if (needsShift && !resolvedShift?.shiftData) {
        console.error('variation/vic impossible : aucun shift de base résolu')
        return false
    }
    return true
}

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

const resolveAssignment = (baseShift, latestAssignment) => {
    if (!latestAssignment) {
        return buildShiftResult(null, baseShift.shift, baseShift.team, baseShift)
    }

    // const assignmentCoherent = checkBaseShiftCoherence(baseShift, latestAssignment)


    // latest assignment is a shift (substitution or swap usually)
    if (latestAssignment.shiftData?.shift) {
        return buildShiftResult(null, latestAssignment.shiftData.shift, latestAssignment.shiftData.team, baseShift, {
            isBaseShift: false,
            isOff: false,
            shiftData: latestAssignment.shiftData,
        })
    }

    return {
        type: latestAssignment.subType,
        isBaseShift: false,
        isOff: latestAssignment.subType === 'absence',
        shiftData: null,
        startTime: latestAssignment.startTime,
        endTime: latestAssignment.endTime,
    }
}


const applyModification = (resolvedShift, latestModification) => {
    if (!latestModification) return resolvedShift

    const modShiftData = latestModification.shiftData

    
    switch (latestModification.subType) {
        case 'variation': 
            
            let result = {
                ...resolvedShift,
                shiftData: {
                    ...resolvedShift.shiftData,
                    selectedVariation: modShiftData.selectedVariation,
                    team: modShiftData.team ?? resolvedShift.shiftData.team,
                },
                startTime: modShiftData.selectedVariation.startTime,
                endTime: modShiftData.selectedVariation.endTime,
            }
            console.log("result", result)
            return result
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
        startTime: addHours(resolvedShift.startTime, latestHourPatch.adjustedTime.adjustedStart),
        endTime: addHours(resolvedShift.endTime, latestHourPatch.adjustedTime.adjustedEnd),
    }
}

const buildAssignmentHistory = (assignments) =>
    assignments.map((a) => ({
        type: a.shiftData?.shift ? 'shift' : a.subType,
        shiftData: a.shiftData,
        wasOverride: a.wasOverride,
    }))

const applyEntries = (baseShift, assignments, modifications, hoursPatches) => {
    const latestAssignment = assignments.at(-1) ?? null
    const latestModification = modifications.at(-1) ?? null
    const latestHourPatch = hoursPatches.at(-1) ?? null

    //console.log("baseShift", baseShift)
    //console.log("latestAssignment", latestAssignment)
    //console.log("latestModification", latestModification)
    //console.log("latestHourPatch", latestHourPatch)

    let resolvedShift = resolveAssignment(baseShift, latestAssignment)

    if (checkModificationCoherence(latestModification, resolvedShift)) {
        resolvedShift = applyModification(resolvedShift, latestModification)
    }

    if (!resolvedShift.isOff) checkHourPatchCoherence(latestModification)
    resolvedShift = applyHourPatch(resolvedShift, latestHourPatch)

    return { resolvedShift, assignmentHistory: buildAssignmentHistory(assignments) }
}

const getActiveEntries = async (user, date) => {
    const populateShiftData = (query) => query
        .populate({ path: 'shiftData', populate: 'shift' })
        .populate({ path: 'shiftData.shift', populate: 'variations' })
        .populate({ path: 'shiftData.selectedVariation' });

    const baseQuery = { userId: user._id, active: true, date, };

    const [assignments, modifications, hoursPatches] = await Promise.all([
        populateShiftData(Assignment.find({ ...baseQuery })).sort({ createdAt: 1 }).lean(),
        populateShiftData(Modification.find({ ...baseQuery })).sort({ createdAt: 1 }).lean(),
        HourPatch.find({ ...baseQuery }).sort({ createdAt: 1 }).lean(),
    ]);

    return { assignments, modifications, hoursPatches };
}

const buildShiftResult = (dateStr, shift, team, baseShift, overrides = {}) => ({
    date: dateStr,
    type: 'shift',
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
const computeShiftOfUserWithSubstitutions = async (dates, userId) => {
    try {
        const user = await User.findById(userId).populate([
            { path: 'teams.teamId' }
        ]);

        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        // if (user.teams?.length === 0) {
        //     console.log('Aucune équipe trouvée pour cet utilisateur');
        // }

        const dateArray = Array.isArray(dates) ? dates : [dates];

        const results = await Promise.all(  
            dateArray.map(async (rawDate) => {
                const date = new Date(rawDate);

                if (isNaN(date.getTime())) {
                    throw new Error(`Date invalide: ${rawDate}`);
                }

                const dateStr = date.toISOString().split('T')[0];

                const { baseShift, team } = await getBaseShift(date, user);

                const { assignments, modifications, hoursPatches } = await getActiveEntries(user, dateStr);

                if (!assignments.length && !modifications.length && !hoursPatches.length) {
                    return buildShiftResult(dateStr, baseShift, team, baseShift, { isOff: baseShift?.optional ?? true })
                }

                // Prends en compte la dernière modification de planning
                else {
                    const {resolvedShift, assignmentHistory} = applyEntries({ shift : baseShift, team }, assignments, modifications, hoursPatches);

                    return {
                        date: dateStr,
                        isOff: resolvedShift?.isOff,
                        vic: resolvedShift?.vic,
                        disp: resolvedShift?.disp,
                        type: resolvedShift?.type,
                        shiftData: resolvedShift?.shiftData,
                        startTime: resolvedShift?.startTime,
                        endTime: resolvedShift?.endTime,
                        history: assignmentHistory,
                        isBaseShift: resolvedShift?.isBaseShift,
                        baseShift: baseShift
                    };
                }

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

export { computeShiftOfUserWithSubstitutions, computeShiftOfUserWithoutSubstitutions }; 