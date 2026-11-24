import { getTeamAtDay } from '../team/team.atDay.js';
import { cycleDayIndex } from '../team/team.cycleIndex.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { isValidDate } from '../../utils/validation.js';
import Center from '../../models/Center.js';
import User from '../../models/User.js';
import Rotation from '../../models/Rotation.js';
import DayComment from '../../models/DayComment.js';
import { Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import { AppError } from '../../error/AppError.js';

/**
 * Calcul des vacations d'un utilisateur, jour par jour : la rotation de son équipe (`baseShift`), puis ce qui s'y ajoute (affectations,
 * modifications, ajustements d'horaires, note du jour). Voir `computeUserShifts` pour le résultat d'un jour.
 */

// ── Heures ────────────────────────────────────────────────────────────

const MINUTES_PER_DAY = 1440;

/** `'06:30'` -> 390 */
const toMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/** 390 -> `'06:30'` ; au-delà d'un jour (ou en dessous de zéro), on repart de minuit */
const toTime = (totalMinutes) => {
    const minutesOfDay = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const hours = Math.floor(minutesOfDay / 60).toString().padStart(2, '0');
    const minutes = (minutesOfDay % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const addHours = (time, hoursToAdd) => toTime(toMinutes(time) + Math.round(hoursToAdd * 60));

// ── Types d'affectation ───────────────────────────────────────────────

/**
 * Types d'affectation qui comptent comme du travail. Les congés (`absence` = « Congé » dans l'interface, `sick_leave`,
 * `maternity_leave`) et la substitution ne comptent pas.
 */
const ASSIGNMENT_WORK_SUBTYPES = new Set([
    'manager', 'english_training', 'training', 'simulation', 'other', 'test', 'office', 'stage', 'instruc', 'custom', 'vis_med',
]);

// ── Résultat d'un jour ────────────────────────────────────────────────

/**
 * Résultat d'un jour : ce que l'utilisateur TIENT (`shiftData`, vide s'il est remplacé ou sur une affectation), ce que la rotation
 * prévoyait (`baseShift`, toujours le document `Shift` de la rotation, jamais ce qui a été modifié), sa `presence`, s'il y a eu
 * une substitution laquelle (`substitution`), et le commentaire du jour (`comment`, la note du jour ou à défaut celui de
 * l'affectation, vide sinon).
 * @param {Object} [overrides] - `baseShift` vaut par défaut la vacation tenue (jour sans entrée : c'est celle de la rotation)
 */
const buildShiftResult = (dayKey, shift, team, overrides = {}) => ({
    date: dayKey,
    type: shift ? 'shift' : 'empty',
    isBaseShift: true,
    presence: 'present',
    shiftData: { shift, selectedVariation: null, team },
    startTime: shift?.default?.startTime,
    endTime: shift?.default?.endTime,
    baseShift: shift,
    substitution: null,
    comment: '',
    ...overrides,
});

// ── Affectations ──────────────────────────────────────────────────────

/**
 * Ce que l'entrée de substitution dit de la vacation de l'utilisateur, ou `null` pour toute autre affectation :
 * - `kind` : `replaced` (il cède sa vacation et n'en a plus), `replacing` (il reprend celle d'un autre), `exchanged` (permutation :
 *   il cède la sienne et prend l'autre) ;
 * - `demandId` : la demande, pour relier le jour à celui qui l'a remplacé ou qu'il remplace ;
 * - `gave` : la vacation cédée, `{ shift, team, selectedVariation }`. Pour une entrée sans `gave` (créée avant ce champ) un remplacé
 *   cède celle de la rotation, exact hors chaîne.
 */
const substitutionOf = (assignment, rotationDay) => {
    if (assignment?.subType !== 'substitution') return null;

    const shiftTaken = assignment.shiftData?.shift ?? null;
    const shiftGiven = assignment.substitution?.gave?.shift
        ? assignment.substitution.gave
        : (shiftTaken ? null : { shift: rotationDay?.shift ?? null, team: rotationDay?.team ?? null, selectedVariation: null });

    return {
        kind: shiftTaken ? (shiftGiven ? 'exchanged' : 'replacing') : 'replaced',
        demandId: assignment.substitution?.id ?? null,
        gave: shiftGiven?.shift
            ? { shift: shiftGiven.shift, team: shiftGiven.team ?? null, selectedVariation: shiftGiven.selectedVariation ?? null }
            : null,
    };
};

/**
 * Historique du jour : les affectations actives dans l'ordre où elles ont été posées. Chaque pas de substitution porte la
 * demande et ce qui a été cédé : dans une chaîne (A remplacé par B, B par C), le pas de B dit « repris de A » puis « cédé à C ».
 */
const buildAssignmentHistory = (assignments, rotationDay) =>
    assignments.map((assignment) => ({
        type: assignment.subType,
        shiftData: assignment.shiftData,
        wasOverride: assignment.wasOverride,
        comment: assignment.comment ?? '',
        substitution: substitutionOf(assignment, rotationDay),
    }));

/**
 * La vacation du jour une fois la dernière affectation appliquée à celle de la rotation.
 * @param {{ shift: Object|null, team: Object|null }} rotationDay - ce que la rotation prévoit ce jour-là
 */
export const resolveAssignment = (rotationDay, latestAssignment) => {
    const rotationShift = rotationDay?.shift ?? null;
    if (!latestAssignment) {
        return buildShiftResult(null, rotationShift, rotationDay?.team ?? null);
    }

    const substitution = substitutionOf(latestAssignment, rotationDay);

    // Vacation concrète : accepteur d'un remplacement, permutation (chacun prend celle de l'autre), affectation à une vacation
    if (latestAssignment.shiftData?.shift) {
        return buildShiftResult(null, latestAssignment.shiftData.shift, latestAssignment.shiftData.team, {
            isBaseShift: false,
            shiftData: latestAssignment.shiftData,
            baseShift: rotationShift,
            comment: latestAssignment.comment ?? '',
            substitution,
        });
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
        comment: latestAssignment.comment ?? '',
        substitution,
    };
};

// ── Modifications et ajustements d'horaires ───────────────────────────

/** Une modification porte sur la vacation tenue : la même que celle de la vacation déjà résolue (remplacé, l'agent n'en tient plus) */
const isSameShift = (resolvedShift, modification) =>
    resolvedShift?.shiftData?.shift?._id?.equals(modification?.shiftData?.shift?._id);

/** Ce que fait une modification (présent, dispo, VIC, variation) à la vacation tenue */
const applyModification = (resolvedShift, modification) => {
    const modificationShiftData = modification.shiftData;

    // La vacation tenue avec une autre variation choisie (ou aucune), et l'équipe de la modification si elle en donne une
    const withSelectedVariation = (selectedVariation, otherChanges = {}) => ({
        ...resolvedShift,
        ...otherChanges,
        shiftData: {
            ...resolvedShift.shiftData,
            selectedVariation,
            team: modificationShiftData.team ?? resolvedShift.shiftData.team,
        },
    });

    switch (modification.subType) {
        case 'variation': {
            const variation = modificationShiftData.selectedVariation;
            return withSelectedVariation(variation, { startTime: variation.startTime, endTime: variation.endTime });
        }
        case 'vic':
            return withSelectedVariation('vic');
        case 'disp':
            return withSelectedVariation('disp', { presence: 'released' });
        case 'pres':
            return withSelectedVariation(null, { presence: 'present' });
        default:
            return resolvedShift;
    }
};

/** Un ajustement d'horaires (MDDA) décale le début et la fin de la vacation d'un agent présent */
const applyHourPatch = (resolvedShift, latestHourPatch) => {
    if (!latestHourPatch || resolvedShift.presence !== 'present') return resolvedShift;
    return {
        ...resolvedShift,
        wasPatched: true,
        startTime: addHours(resolvedShift.startTime, latestHourPatch.adjustedTime.adjustedStart),
        endTime: addHours(resolvedShift.endTime, latestHourPatch.adjustedTime.adjustedEnd),
    };
};

/** Un ajustement d'horaires n'a pas de sens sur une vacation annulée par une absence */
const checkHourPatchCoherence = (latestModification) => {
    if (latestModification?.subType === 'absence') {
        throw new Error('hourPatch incohérent : le shift est annulé (absence)');
    }
};

// ── Présence et travail ───────────────────────────────────────────────

/** Jour facultatif de la rotation que rien n'a confirmé (ni affectation, ni modification) : l'agent n'y est pas */
const isUnconfirmedOptional = (shift, { latestAssignment, latestModification } = {}) =>
    Boolean(shift?.optional)
    && !latestAssignment
    && !['pres', 'variation', 'vic'].includes(latestModification?.subType);

/**
 * `isWorked` : le jour compte comme TRAVAILLÉ pour les règles de repos et de charge (compatibilité, contrôle des 7 jours).
 * Ce n'est pas `presence`, qui dit seulement si l'agent est à ce qu'il tient (présent, en dispo, jour facultatif non confirmé,
 * remplacé) : un jour peut être « présent » sans être travaillé (repos, congé, VIC passé).
 * - pas présent (dispo, non confirmé, remplacé) : non ;
 * - affectation sans vacation : travaillée si son type est dans ASSIGNMENT_WORK_SUBTYPES et qu'elle a ses horaires ;
 * - vacation de travail : travaillée, un VIC aussi, même passé (règle de travail : le VIC compte comme un jour travaillé) ;
 * - tout le reste (repos, congé, arrêt maladie...) : non.
 */
const computeIsWorked = (resolvedShift, { latestAssignment }) => {
    if (resolvedShift.presence !== 'present') return false;

    const isAssignmentWithoutShift = latestAssignment && !latestAssignment.shiftData?.shift;
    if (isAssignmentWithoutShift) {
        return ASSIGNMENT_WORK_SUBTYPES.has(latestAssignment.subType) && Boolean(resolvedShift.startTime && resolvedShift.endTime);
    }

    return resolvedShift.shiftData?.shift?.type === 'work';
};

// ── Un jour : la rotation, puis les entrées ───────────────────────────

/**
 * Applique à la vacation de la rotation les entrées actives du jour, dans l'ordre : affectation, modification, présence d'un jour
 * facultatif, ajustement d'horaires ; puis calcule `isWorked`.
 * @param {{ shift: Object|null, team: Object|null }} rotationDay - ce que la rotation prévoit ce jour-là
 * @param {Array} assignments - dans l'ordre où elles ont été posées
 * @param {Array} modifications - idem
 * @param {Array} hourPatches - idem
 */
export const applyEntries = (rotationDay, assignments, modifications, hourPatches) => {
    const latestAssignment = assignments.at(-1) ?? null;
    const latestModification = modifications.at(-1) ?? null;
    const latestHourPatch = hourPatches.at(-1) ?? null;

    let resolvedShift = resolveAssignment(rotationDay, latestAssignment);

    // Une modification porte sur la vacation tenue ; remplacé, l'agent n'en tient plus (`shiftData.shift` vide) : rien à modifier
    if (isSameShift(resolvedShift, latestModification)) {
        resolvedShift = applyModification(resolvedShift, latestModification);
    }

    const isUnconfirmed = isUnconfirmedOptional(resolvedShift.shiftData?.shift, { latestAssignment, latestModification });
    if (resolvedShift.presence === 'present' && isUnconfirmed) {
        resolvedShift = { ...resolvedShift, presence: 'unconfirmed' };
    }

    if (resolvedShift.presence === 'present') checkHourPatchCoherence(latestModification);
    resolvedShift = applyHourPatch(resolvedShift, latestHourPatch);

    resolvedShift = { ...resolvedShift, isWorked: computeIsWorked(resolvedShift, { latestAssignment }) };

    return { resolvedShift, assignmentHistory: buildAssignmentHistory(assignments, rotationDay) };
};

// ── Chargement des entrées et des notes ───────────────────────────────

/** Le jour (`YYYY-MM-DD`) d'une entrée : sa date est une chaîne, ou un `Date` pour les plus anciennes */
const dayKeyOfEntry = (entry) => (typeof entry.date === 'string' ? entry.date.slice(0, 10) : entry.date);

/** Les notes de jour (`DayComment`) de l'utilisateur sur une plage de jours : jour -> commentaire */
const getDayCommentsByDay = async (userId, dayKeys) => {
    const notes = await DayComment.find({ userId, date: { $in: dayKeys } }).select('date comment').lean();
    return new Map(notes.map((note) => [note.date, note.comment]));
};

/** Charge toutes les entrées actives de l'utilisateur sur une plage de jours, groupées par jour */
const getActiveEntriesByDay = async (user, dayKeys) => {
    const populateShiftData = (query) => query
        .populate({ path: 'shiftData', populate: 'shift' })
        .populate({ path: 'shiftData.shift', populate: 'variations' })
        .populate({ path: 'shiftData.selectedVariation' })
        .populate({ path: 'shiftData.team' });

    const activeEntriesFilter = { userId: user._id, active: true, date: { $in: dayKeys } };

    const [assignments, modifications, hourPatches] = await Promise.all([
        populateShiftData(Assignment.find(activeEntriesFilter))
            .populate({ path: 'substitution.gave.shift', populate: 'variations' })
            .populate({ path: 'substitution.gave.selectedVariation' })
            .sort({ createdAt: 1 }).lean(),
        populateShiftData(Modification.find(activeEntriesFilter)).sort({ createdAt: 1 }).lean(),
        HourPatch.find(activeEntriesFilter).sort({ createdAt: 1 }).lean(),
    ]);

    const entriesByDay = Object.fromEntries(
        dayKeys.map((dayKey) => [dayKey, { assignments: [], modifications: [], hourPatches: [] }]),
    );

    const groupByDay = (entries, listName) => {
        for (const entry of entries) {
            entriesByDay[dayKeyOfEntry(entry)]?.[listName].push(entry);
        }
    };
    groupByDay(assignments, 'assignments');
    groupByDay(modifications, 'modifications');
    groupByDay(hourPatches, 'hourPatches');

    return entriesByDay;
};

// ── Ce que la rotation prévoit ────────────────────────────────────────

/** L'identifiant du centre d'une équipe (peuplé ou non) */
const centerIdOf = (team) => team.center?._id ?? team.center;

/**
 * Les centres des équipes de l'utilisateur, par identifiant, en une seule lecture : le cycle d'une équipe part de l'ancre de son centre.
 * (Les équipes d'un utilisateur peuvent être de plusieurs centres : une mutation, avec ses anciennes équipes.)
 */
const loadTeamCenters = async (user) => {
    const centerIds = (user.teams ?? []).map((occurrence) => occurrence.teamId && centerIdOf(occurrence.teamId)).filter(Boolean);
    const centers = await Center.find({ _id: { $in: centerIds } }).select('cycleAnchorDate cycleAnchorDay').lean();
    return new Map(centers.map((center) => [String(center._id), center]));
};

/**
 * Ce que la rotation active prévoit pour une équipe un jour donné. La rotation active est résolue jour par jour (dernière activation
 * <= ce jour, comme findLatestRotation) : avant, une seule rotation (celle de la dernière date du lot) servait à tout le lot, et un
 * mois contenant un changement de rotation affichait la nouvelle rotation avant son activation.
 * La chronologie des activations est chargée une fois par centre, chaque rotation peuplée une fois.
 * @param {Map<string, Object>} centersById - voir loadTeamCenters
 * @returns {(team: Object, dayKey: string) => Promise<Object|null>} la vacation (`Shift`) de la rotation, ou `null`
 */
const createRotationShiftResolver = (centersById) => {
    const activationTimelineByCenter = new Map();
    const populatedRotationById = new Map();

    /** Les activations de rotation d'un centre, de la plus ancienne à la plus récente : `[{ rotationId, day }]` */
    const getActivationTimeline = (centerId) => {
        const key = String(centerId);
        if (!activationTimelineByCenter.has(key)) {
            activationTimelineByCenter.set(key, (async () => {
                const rotations = await Rotation.find({ centerId, deleted: false }).select('activationDates activationDays').lean();
                return rotations
                    .flatMap((rotation) => activationDaysOf(rotation).map((activationDay) => ({
                        rotationId: String(rotation._id),
                        day: activationDay,
                    })))
                    .sort((first, second) => first.day.localeCompare(second.day)); // les clés de jour se comparent comme les jours
            })());
        }
        return activationTimelineByCenter.get(key);
    };

    /** La rotation en vigueur le jour donné, avec ses jours et leurs variations, ou `null` */
    const getActiveRotation = async (team, dayKey) => {
        const centerId = centerIdOf(team);
        if (!centerId) return null;

        const timeline = await getActivationTimeline(centerId);
        const latestActivation = timeline.filter((activation) => activation.day <= dayKey).at(-1);
        if (!latestActivation) return null;

        if (!populatedRotationById.has(latestActivation.rotationId)) {
            populatedRotationById.set(latestActivation.rotationId, Rotation.findById(latestActivation.rotationId).populate({
                path: 'days',
                populate: { path: 'variations' },
            }).exec()); // exec() : une promesse réutilisable, pas une Query qu'on ne peut attendre qu'une fois
        }
        return populatedRotationById.get(latestActivation.rotationId);
    };

    return async (team, dayKey) => {
        const rotation = await getActiveRotation(team, dayKey);
        const center = centersById.get(String(centerIdOf(team))) ?? null;

        if (!rotation?.days?.length) return null;
        const dayIndex = cycleDayIndex(team, center, dayKey, rotation.days.length);
        if (dayIndex === null) return null;
        return rotation.days[dayIndex] || null;
    };
};

// ── Résultat de computeUserShifts ─────────────────────────────────────

/**
 * Les jours demandés, un tableau de clés `YYYY-MM-DD` (une seule clé est acceptée aussi). Rien d'autre qu'une clé de jour n'est accepté
 * (400) : un instant (`Date`, ISO avec heure) dépend d'un fuseau, c'est à l'appelant de le placer sur un jour (`toCalendarDay`,
 * `posterDayOf`...).
 */
const toDayKeys = (dayKeys) => {
    const keys = Array.isArray(dayKeys) ? dayKeys : [dayKeys];
    for (const dayKey of keys) {
        if (!isValidDate(dayKey)) throw new AppError(`Date invalide: ${dayKey}`, 400);
    }
    return keys;
};

/**
 * Récupère les vacations d'un utilisateur à des dates données, en prenant en compte les substitutions, modifications et notes de
 * planning. Un résultat par date demandée, dans l'ordre :
 * - `shiftData`, `baseShift`, `presence`, `substitution`, `history`, `isWorked`, `comment`... : voir `buildShiftResult` et
 *   `applyEntries` ;
 * - un jour facultatif de la rotation que rien n'a confirmé n'est pas travaillé (`presence: 'unconfirmed'`).
 * @param {string|string[]} dayKeys - Les jours (`YYYY-MM-DD`), un seul ou un tableau
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Array>} - Un tableau des shifts de l'utilisateur
 */
const computeUserShifts = async (dayKeys, userId) => {
    try {
        const user = await User.findById(userId).populate([{ path: 'teams.teamId' }]);
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        const requestedDayKeys = toDayKeys(dayKeys);

        const [dayComments, entriesByDay, centersById] = await Promise.all([
            getDayCommentsByDay(userId, requestedDayKeys),
            getActiveEntriesByDay(user, requestedDayKeys),
            loadTeamCenters(user),
        ]);
        const getRotationShift = createRotationShiftResolver(centersById);

        const computeDay = async (dayKey) => {
            const teamOccurrence = user.teams?.length ? getTeamAtDay(user.teams, dayKey) : null;
            const team = teamOccurrence?.teamId ?? null;
            const baseShift = team ? await getRotationShift(team, dayKey) : null;

            const { assignments, modifications, hourPatches } =
                entriesByDay[dayKey] ?? { assignments: [], modifications: [], hourPatches: [] };
            const hasEntries = assignments.length || modifications.length || hourPatches.length;

            // Sans rien d'explicite, un jour facultatif de la rotation n'est pas travaillé
            if (!hasEntries) {
                const isUnconfirmed = isUnconfirmedOptional(baseShift);
                return buildShiftResult(dayKey, baseShift, team, {
                    presence: isUnconfirmed ? 'unconfirmed' : 'present',
                    isWorked: baseShift?.type === 'work' && !isUnconfirmed,
                    history: [],
                });
            }

            const { resolvedShift, assignmentHistory } = applyEntries(
                { shift: baseShift, team },
                assignments,
                modifications,
                hourPatches,
            );
            return { ...resolvedShift, date: dayKey, history: assignmentHistory };
        };

        const shifts = await Promise.all(requestedDayKeys.map(computeDay));

        // La note du jour, indépendante de la vacation et des entrées, l'emporte sur le commentaire d'une affectation
        return shifts.map((shift) => (dayComments.has(shift.date) ? { ...shift, comment: dayComments.get(shift.date) } : shift));
    } catch (error) {
        console.error('Erreur dans le calcul des vacations : ', error.message);
        throw error;
    }
};

export { computeUserShifts };
