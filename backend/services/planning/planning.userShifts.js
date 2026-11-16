import { getTeamAtDay } from "../team/team.atDay.js";
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { DEFAULT_TIME_ZONE } from '../../utils/dates/constants.js';
import { compareDays, toPlainDate, todayIn } from '../../utils/dates/plainDate.js';
import { Temporal } from '@js-temporal/polyfill';
import { toCalendarDay } from '../../utils/dates/calendarDay.js';
import { cycleDayIndex } from '../team/team.cycleIndex.js';
import Center from '../../models/Center.js';
import User from "../../models/User.js";
import { Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
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

// ── Résolution ────────────────────────────────────────────────────────

/**
 * Ce que l'entrée de substitution dit de la vacation de l'utilisateur, ou `null` pour toute autre affectation :
 * - `kind` : `replaced` (il cède sa vacation et n'en a plus), `replacing` (il reprend celle d'un autre), `exchanged` (permutation :
 *   il cède la sienne et prend l'autre) ;
 * - `demandId` : la demande, pour relier le jour à celui qui l'a remplacé ou qu'il remplace ;
 * - `gave` : la vacation cédée, `{ shift, team, selectedVariation }`. Pour une entrée sans `gave` (créée avant ce champ) un remplacé
 *   cède celle de la rotation, exact hors chaîne.
 */
const substitutionOf = (assignment, rotationDay) => {
    if (assignment?.subType !== 'substitution') return null
    const took = assignment.shiftData?.shift ?? null
    const gave = assignment.substitution?.gave?.shift
        ? assignment.substitution.gave
        : (took ? null : { shift: rotationDay?.shift ?? null, team: rotationDay?.team ?? null, selectedVariation: null })
    return {
        kind: took ? (gave ? 'exchanged' : 'replacing') : 'replaced',
        demandId: assignment.substitution?.id ?? null,
        gave: gave?.shift ? { shift: gave.shift, team: gave.team ?? null, selectedVariation: gave.selectedVariation ?? null } : null,
    }
}

/**
 * Historique du jour : les affectations actives dans l'ordre où elles ont été posées. Chaque pas de substitution porte la
 * demande et ce qui a été cédé : dans une chaîne (A remplacé par B, B par C), le pas de B dit « repris de A » puis « cédé à C ».
 */
const buildAssignmentHistory = (assignments, rotationDay) =>
    assignments.map((a) => ({
        type: a.subType,
        shiftData: a.shiftData,
        wasOverride: a.wasOverride,
        substitution: substitutionOf(a, rotationDay),
    }))

/**
 * @param {{ shift: Object|null, team: Object|null }} rotationDay - ce que la rotation prévoit ce jour-là
 */
export const applyEntries = (rotationDay, assignments, modifications, hoursPatches, { day, today }) => {
    const latestAssignment = assignments.at(-1) ?? null
    const latestModification = modifications.at(-1) ?? null
    const latestHourPatch = hoursPatches.at(-1) ?? null

    let resolvedShift = resolveAssignment(rotationDay, latestAssignment)

    // Une modification porte sur la vacation tenue ; remplacé, l'agent n'en tient plus (`shiftData.shift` vide) : rien à modifier
    if (isSameShift(resolvedShift, latestModification)) {
        resolvedShift = applyModification(resolvedShift, latestModification)
    }

    if (resolvedShift.presence === 'present'
        && isUnconfirmedOptional(resolvedShift.shiftData?.shift, { latestAssignment, latestModification })) {
        resolvedShift = { ...resolvedShift, presence: 'unconfirmed' }
    }

    if (resolvedShift.presence === 'present') checkHourPatchCoherence(latestModification)
    resolvedShift = applyHourPatch(resolvedShift, latestHourPatch)

    resolvedShift = { ...resolvedShift, isWorked: computeIsWorked(resolvedShift, { latestAssignment, day, today }) }

    return { resolvedShift, assignmentHistory: buildAssignmentHistory(assignments, rotationDay) }
}

/** Jour facultatif de la rotation que rien n'a confirmé (ni affectation, ni modification « présent ») : l'agent n'y est pas */
const isUnconfirmedOptional = (shift, { latestAssignment, latestModification } = {}) =>
    Boolean(shift?.optional) && !latestAssignment && latestModification?.subType !== 'pres'

/**
 * `isWorked` : le jour compte comme TRAVAILLÉ pour les règles de repos et de charge (compatibilité, contrôle des 7 jours).
 * Ce n'est pas `presence`, qui dit seulement si l'agent est à ce qu'il tient (présent, en dispo, jour facultatif non confirmé,
 * remplacé) : un jour peut être « présent » sans être travaillé (repos, congé, VIC passé).
 * - pas présent (dispo, non confirmé, remplacé) : non ;
 * - affectation sans vacation : travaillée si son type est dans ASSIGNMENT_WORK_SUBTYPES et qu'elle a ses horaires ;
 * - vacation de travail : travaillée, sauf un VIC dont le jour est passé (compté comme un jour off) ;
 * - tout le reste (repos, congé, arrêt maladie...) : non.
 */
const computeIsWorked = (result, { latestAssignment, day, today }) => {
    if (result.presence !== 'present') return false

    if (latestAssignment && !latestAssignment.shiftData?.shift) {
        return ASSIGNMENT_WORK_SUBTYPES.has(latestAssignment.subType) && Boolean(result.startTime && result.endTime)
    }

    const shift = result.shiftData?.shift
    if (shift?.type !== 'work') return false

    if (result.shiftData.selectedVariation === 'vic' && compareDays(day, today) < 0) return false

    return true
}

/** Types d'affectation qui comptent comme du travail ; les congés (`absence` = « Congé » dans l'interface, `sick_leave`, `maternity_leave`) et la substitution non */
const ASSIGNMENT_WORK_SUBTYPES = new Set([
    'manager', 'english_training', 'training', 'simulation', 'other', 'test', 'office', 'stage', 'instruc', 'custom', 'vis_med',
])

export const resolveAssignment = (rotationDay, latestAssignment) => {
    const rotationShift = rotationDay?.shift ?? null
    if (!latestAssignment) {
        return buildShiftResult(null, rotationShift, rotationDay?.team ?? null)
    }

    const substitution = substitutionOf(latestAssignment, rotationDay)

    // Vacation concrète : accepteur d'un remplacement, permutation (chacun prend celle de l'autre), affectation à une vacation
    if (latestAssignment.shiftData?.shift) {
        return buildShiftResult(null, latestAssignment.shiftData.shift, latestAssignment.shiftData.team, {
            isBaseShift: false,
            shiftData: latestAssignment.shiftData,
            baseShift: rotationShift,
            substitution,
        })
    }

    // Aucune vacation tenue : `shiftData.shift` est vide. Remplacé, l'agent a cédé la sienne (`substitution.gave`, ce qu'on barre à
    // l'affichage) ; toute autre affectation (formation, congé, bureau...) n'est pas une vacation non plus, c'est un type à part.
    // `isWorked` est calculé ensuite (computeIsWorked).
    return {
        type: latestAssignment.subType,
        isBaseShift: false,
        presence: substitution?.kind === 'replaced' ? 'replaced' : 'present',
        shiftData: { shift: null, selectedVariation: null, team: rotationDay?.team ?? null },
        startTime: latestAssignment.startTime ?? null,
        endTime: latestAssignment.endTime ?? null,
        baseShift: rotationShift,
        substitution,
    }
}

const applyModification = (resolvedShift, latestModification) => {
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
                presence: 'released',
                shiftData: {
                    ...resolvedShift.shiftData,
                    selectedVariation: 'disp',
                    team: modShiftData.team ?? resolvedShift.shiftData.team,
                },
            }
        case 'pres':
            return {
                ...resolvedShift,
                presence: 'present',
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
    if (!latestHourPatch || resolvedShift.presence !== 'present') return resolvedShift
    return {
        ...resolvedShift,
        wasPatched: true,
        startTime: addHours(resolvedShift.startTime, latestHourPatch.adjustedTime.adjustedStart),
        endTime: addHours(resolvedShift.endTime, latestHourPatch.adjustedTime.adjustedEnd),
    }
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
        populateShiftData(Assignment.find(baseQuery))
            .populate({ path: 'substitution.gave.shift', populate: 'variations' })
            .populate({ path: 'substitution.gave.selectedVariation' })
            .sort({ createdAt: 1 }).lean(),
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

/**
 * Résultat d'un jour : ce que l'utilisateur TIENT (`shiftData`, vide s'il est remplacé ou sur une affectation), ce que la rotation
 * prévoyait (`baseShift`, toujours le document `Shift` de la rotation, jamais ce qui a été modifié), sa `presence` et, s'il y a eu
 * une substitution, laquelle (`substitution`).
 * @param {Object} [overrides] - `baseShift` vaut par défaut la vacation tenue (jour sans entrée : c'est celle de la rotation)
 */
const buildShiftResult = (dateStr, shift, team, overrides = {}) => ({
    date: dateStr,
    type: shift ? 'shift' : "empty",
    isBaseShift: true,
    presence: 'present',
    shiftData: { shift, selectedVariation: null, team: team },
    startTime: shift?.default?.startTime,
    endTime: shift?.default?.endTime,
    baseShift: shift,
    substitution: null,
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
        const today = todayIn(timeZone);

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
                    // Sans rien d'explicite, un jour facultatif de la rotation n'est pas travaillé
                    const unconfirmed = isUnconfirmedOptional(baseShift)
                    return buildShiftResult(dateStr, baseShift, team, {
                        presence: unconfirmed ? 'unconfirmed' : 'present',
                        isWorked: baseShift?.type === 'work' && !unconfirmed,
                        history: [],
                    });
                }

                const { resolvedShift, assignmentHistory } = applyEntries(
                    { shift: baseShift, team },
                    assignments,
                    modifications,
                    hoursPatches,
                    { day, today }
                );

                return { ...resolvedShift, date: dateStr, history: assignmentHistory };
            })
        );
        return results;
    } catch (error) {
        console.error('Erreur dans le calcul des vacations : ', error.message);
        throw error;
    }
};

export { computeUserShifts };