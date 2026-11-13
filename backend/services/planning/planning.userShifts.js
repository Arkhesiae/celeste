import { getTeamAtDay } from "../team/team.atDay.js";
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { DEFAULT_TIME_ZONE } from '../../utils/dates/constants.js';
import { toPlainDate } from '../../utils/dates/plainDate.js';
import { sameId } from '../../utils/ids.js';
import { Temporal } from '@js-temporal/polyfill';
import { toCalendarDay } from '../../utils/dates/calendarDay.js';
import { cycleDayIndex } from '../team/team.cycleIndex.js';
import Center from '../../models/Center.js';
import User from "../../models/User.js";
import Substitution from '../../models/Substitution.js';
import { CalendarEntry, Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import Shift from '../../models/Shift.js';
import Rotation from '../../models/Rotation.js';
import { AppError } from '../../error/AppError.js';



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

    if (!sameId(latestAssignment?.baseShift?.shift._id, baseShift.shift._id)) {
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
            throw new AppError('Utilisateur non trouvé', 404);
        }

        // Centre de l'utilisateur : son fuseau place les instants reçus (horodatages) sur un jour calendaire
        const centerByKey = new Map();
        const getCenter = (centerId) => {
            const key = String(centerId);
            if (!centerByKey.has(key)) centerByKey.set(key, Center.findById(centerId).select('cycleAnchorDate cycleAnchorDay timeZone').lean().exec());
            return centerByKey.get(key);
        };
        const userCenter = user.centerId ? await getCenter(user.centerId) : null;
        const timeZone = userCenter?.timeZone || DEFAULT_TIME_ZONE;

        // Chaque date devient un jour calendaire (PlainDate) ; les jours sont déjà des chaînes YYYY-MM-DD dans la
        // plupart des appels, les instants (Date, ISO avec fuseau) sont lus dans le fuseau du centre
        const dateArray = Array.isArray(dates) ? dates : [dates];
        const normalizedDates = dateArray.map((rawDate) => {
            const day = toCalendarDay(rawDate, timeZone);
            if (!day) throw new AppError(`Date invalide: ${rawDate}`, 400);
            return { day, dateStr: day.toString() };
        });

        const entriesByDate = await getActiveEntriesByDates(
            user,
            normalizedDates.map((d) => d.dateStr)
        );

        // Rotation active à chaque date : même règle que findLatestRotation (dernière activation <= date), mais
        // résolue jour par jour. Avant, une seule rotation (celle de la dernière date du lot) servait à tout le lot :
        // un mois contenant un changement de rotation affichait la nouvelle rotation avant son activation.
        // Chronologie des activations chargée une fois par centre, rotations peuplées une fois chacune.
        const timelineByCenter = new Map();
        const populatedRotations = new Map();

        const getTimeline = async (centerId) => {
            const key = String(centerId);
            if (!timelineByCenter.has(key)) {
                timelineByCenter.set(key, (async () => {
                    const rotations = await Rotation.find({ centerId, deleted: false }).select('activationDates activationDays').lean();
                    return rotations
                        .flatMap((r) => activationDaysOf(r).map((d) => ({ rotationId: String(r._id), day: toPlainDate(d) })))
                        .sort((a, b) => Temporal.PlainDate.compare(a.day, b.day));
                })());
            }
            return timelineByCenter.get(key);
        };

        const getPopulatedRotation = async (team, day) => {
            const centerId = team.center?._id ?? team.center;
            if (!centerId) return null;

            const timeline = await getTimeline(centerId);
            const active = timeline.filter((entry) => Temporal.PlainDate.compare(entry.day, day) <= 0).at(-1);
            if (!active) return null;

            if (!populatedRotations.has(active.rotationId)) {
                populatedRotations.set(active.rotationId, Rotation.findById(active.rotationId).populate({
                    path: 'days',
                    populate: { path: 'variations' }
                }).exec());   // exec() : une promesse réutilisable, pas une Query qu'on ne peut attendre qu'une fois
            }
            return populatedRotations.get(active.rotationId);
        };
        const shiftFromRotation = (team, center, day, rotation) => {
            if (!rotation?.days?.length) return null;
            const dayIndex = cycleDayIndex(team, center, day, rotation.days.length);
            if (dayIndex === null) return null;
            return rotation.days[dayIndex] || null;
        };

        const results = await Promise.all(
            normalizedDates.map(async ({ day, dateStr }) => {
                const teamOcc = user.teams?.length ? getTeamAtDay(user.teams, day) : null;
                const team = teamOcc?.teamId ?? null;

                let baseShift = null;
                if (team) {
                    const rotation = await getPopulatedRotation(team, day);
                    const center = await getCenter(team.center?._id ?? team.center);
                    baseShift = shiftFromRotation(team, center, day, rotation);
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

export { computeUserShifts };