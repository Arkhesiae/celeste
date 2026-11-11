import { CalendarEntry, Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import { toDay } from '../../utils/dates/dayFields.js';
import { dayFilter, posterDayOf } from '../../utils/dates/dayAccess.js';
import { toDateKey } from '../../utils/dates/dateKey.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { computeUserShifts } from '../planning/computeUserShifts.js';
import { AppError } from '../../error/AppError.js';
import * as demandMutationsService from '../substitution/index.js';
import overlap from '../../utils/shifts/overlapTest.js';

async function cancelModifications (userId, date) {
    const modifications = await Modification.find({ userId, date, active: true });
    modifications.forEach((modification) => {
        modification.active = false;
        modification.save();
    });
}

async function cancelAssignments (userId, date) {
    const assignments = await Assignment.find({ userId, date, active: true });
    assignments.forEach((assignment) => {
        cancelSingleAssignment(assignment);
    });
}

async function cancelSingleAssignment (assignment) {
    if (assignment.subType !== "substitution") {
        assignment.active = false;
        await assignment.save();
        //cancelSubstitutionAssignment(assignment);
    }
}

async function cancelSubstitutionAssignment (assignment) {
    const demand = await Substitution.findById(assignment.substitution.id);
    const isPoster = sameId(demand?.posterId, assignment?.userId);
    if (isPoster) {
        demandMutationsService.cancelRequest(demand._id);
    } else {
        demandMutationsService.withdrawFromRequest(demand._id, assignment.userId.toString());
    }
}

async function cancelHourPatches (userId, date) {
    const hourPatches = await HourPatch.find({ userId, date, active: true });
    hourPatches.forEach((hourPatch) => {
        hourPatch.active = false;
        hourPatch.save();
    });
}



const isSameShift = (userShift, data) =>
    sameId(userShift?.[0]?.shiftData?.shift?._id, data.shiftId);


export async function registerEntry (userId, date, data) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const handlers = {
        assignment: registerAssignment,
        modification: registerModification,
        hourPatch: registerHourPatch,
    };

    const handler = handlers[data.type];
    if (!handler) {
        throw new AppError('Type d\'entrée invalide', 400);
    }

    const [userShift, substitution, latestAssignment, latestModification, latestHourPatch] = await Promise.all([
        computeUserShifts([date], userId),
        Substitution.findOne({
            $and: [
                { $or: [{ posterId: userId }, { accepterId: userId }] },
                dayFilter('posterShift.day', 'posterShift.date', { eq: toDay(date) }),
            ],
            status: { $in: ['open', 'accepted'] },
        }).sort({ createdAt: -1 }),
        Assignment.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
        Modification.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
        HourPatch.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
    ]);

    const recomputeShift = () => computeUserShifts([date], userId);

    const result = await handler(user, date, data, { userShift, substitution, latestAssignment, latestModification, latestHourPatch, recomputeShift });
    return result;
}

async function registerModification (user, date, data, { userShift, latestModification, recomputeShift }) {
    if (!isSameShift(userShift, data)) {
        throw new AppError('Impossible de créer une modification car le shift ne correspond pas', 422);
    }

    if (latestModification) {
        latestModification.active = false;
        await latestModification.save();
    }

    await cancelHourPatches(user._id, date);

    const entry = new CalendarEntry({
        type: data.type,
        subType: data.entryType,
        shiftData: {
            shift: data.shiftId,
            selectedVariation: data.selectedVariation,
            team: data.teamId,
        },
        userId: user._id,
        date,
        centerId: user.centerId,
    });

    await entry.save();
    return { userShift: await recomputeShift(), updatedDemands: null, type: 'modification' };
}

async function registerAssignment (user, date, data, { substitution, latestAssignment, recomputeShift }) {
    if (latestAssignment?.subType === 'substitution') {
        throw new AppError('Impossible de créer une entrée sur un remplacement actif, annulez d\'abord le remplacement', 422);
    }

    if (substitution) {
        throw new AppError('Impossible de créer une entrée si une demande est en cours ce jour', 409);
    }

    if (latestAssignment) {
        latestAssignment.active = false;
        await latestAssignment.save();
    }

    await cancelModifications(user._id, date);
    await cancelHourPatches(user._id, date);


    const entry = new CalendarEntry({
        type: data.type,
        subType: data.entryType,
        ...(data.shiftId && {
            shiftData: {
                shift: data.shiftId,
                selectedVariation: data.selectedVariation,
                team: data.team,
            },
        }),
        userId: user._id,
        date,
        centerId: user.centerId,
        startTime: data.startTime,
        endTime: data.endTime,
    });

    await entry.save();
    return { userShift: await recomputeShift(), updatedDemands: null, type: 'creation' };
}

async function registerHourPatch (user, date, data, { latestHourPatch, recomputeShift }) {
    if (latestHourPatch) {
        latestHourPatch.active = false;
        await latestHourPatch.save();
    }

    // Horaires de référence SANS patch (après désactivation de l'ancien)
    const userShift = await computeUserShifts([date], user._id);
    const current = userShift?.[0];
    const currentShiftId = current?.shiftData?.shift?._id?.toString?.()
        ?? current?.shiftData?.shift?.toString?.();
    const requestedShiftId = data.shiftId?.toString?.() ?? data.shiftId;

    if (!currentShiftId || !requestedShiftId || currentShiftId !== requestedShiftId) {
        throw new AppError('Impossible de créer une MDDA car le shift ne correspond pas', 422);
    }

    const teamFromShift = current?.shiftData?.team;
    const teamId = data.teamId
        ?? data.team
        ?? teamFromShift?._id
        ?? teamFromShift
        ?? current?.baseShift?.team?._id
        ?? current?.baseShift?.team;

    if (!teamId) {
        throw new AppError('Impossible de créer une MDDA : équipe introuvable', 422);
    }

    const baseStart = current?.startTime;
    const baseEnd = current?.endTime;
    if (!baseStart || !baseEnd) {
        throw new AppError('Impossible de créer une MDDA : horaires de référence introuvables', 422);
    }

    const toMinutes = (time) => {
        const [h, m] = String(time).split(':').map(Number);
        if (!Number.isFinite(h) || !Number.isFinite(m)) {
            throw new AppError('Format d\'heure invalide (HH:MM attendu)', 400);
        }
        return h * 60 + m;
    };

    let adjustedStart;
    let adjustedEnd;

    if (data.startTime != null && data.endTime != null) {
        adjustedStart = (toMinutes(data.startTime) - toMinutes(baseStart)) / 60;
        adjustedEnd = (toMinutes(data.endTime) - toMinutes(baseEnd)) / 60;
    } else if (data.adjustedTime?.adjustedStart != null && data.adjustedTime?.adjustedEnd != null) {
        adjustedStart = Number(data.adjustedTime.adjustedStart);
        adjustedEnd = Number(data.adjustedTime.adjustedEnd);
    } else {
        throw new AppError('Horaires MDDA requis (startTime / endTime)', 400);
    }

    if (!Number.isFinite(adjustedStart) || !Number.isFinite(adjustedEnd)) {
        throw new AppError('Ajustements MDDA invalides', 400);
    }

    if (adjustedStart === 0 && adjustedEnd === 0) {
        throw new AppError('Les horaires MDDA sont identiques aux horaires prévus', 400);
    }

    const selectedVariation = data.selectedVariation
        && data.selectedVariation !== 'vic'
        && data.selectedVariation !== 'disp'
        && data.selectedVariation !== 'pres'
        ? (data.selectedVariation._id ?? data.selectedVariation)
        : (current?.shiftData?.selectedVariation?._id ?? null);

    const entry = new HourPatch({
        userId: user._id,
        subType: 'mdda',
        date,
        adjustedTime: {
            adjustedStart,
            adjustedEnd,
        },
        centerId: user.centerId,
        shiftData: {
            shift: data.shiftId,
            selectedVariation,
            team: teamId,
        },
    });

    await entry.save();
    return { userShift: await recomputeShift(), updatedDemands: null, type: 'creation' };
}



async function registerMDDA (userId, date, data) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const userShift = await computeUserShifts([date], userId);

    if (!isSameShift(userShift, data)) {
        throw new AppError('Impossible de créer une MDDA car le shift ne correspond pas', 422);
    }

    const teamFromShift = userShift[0]?.shiftData?.team;
    const teamId = data.teamId
        ?? data.team
        ?? teamFromShift?._id
        ?? teamFromShift;

    if (!teamId) {
        throw new AppError('Impossible de créer une MDDA : équipe introuvable', 422);
    }

    const mdda = new HourPatch({
        userId,
        subType: 'mdda',
        date,
        adjustedTime: {
            adjustedStart: 1,
            adjustedEnd: 2,
        },
        centerId: user.centerId,
        shiftData: {
            shift: data.shiftId,
            selectedVariation: data.selectedVariation ?? userShift[0]?.shiftData?.selectedVariation?._id ?? null,
            team: teamId,
        },
    });
    await mdda.save();
}

export async function restoreInitialShift (userId, date) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const initialShift = await computeUserShifts([date], userId);

    cancelModifications(userId, date);
    cancelAssignments(userId, date);
    cancelHourPatches(userId, date);

    const userShift = await computeUserShifts([date], userId);

    return { userShift, updatedDemands: null, type: "restoration" };
}

export async function addSubstitutionEntries (demand) {
    if (!demand) {
        throw new AppError('Demande invalide', 400);
    }

    try {
        const dateStr = posterDayOf(demand);

        const [latestAccepterAssignment, latestPosterAssignment] = await Promise.all([
            Assignment.findOne({ userId: demand.accepterId, date: dateStr, active: true, subType: { $ne: 'substitution' } }).sort({ createdAt: -1 }),
            Assignment.findOne({ userId: demand.posterId, date: dateStr, active: true, subType: { $ne: 'substitution' } }).sort({ createdAt: -1 }),
        ]);

        await Promise.all([
            latestAccepterAssignment && Assignment.updateOne({ _id: latestAccepterAssignment._id }, { active: false }),
            latestPosterAssignment && Assignment.updateOne({ _id: latestPosterAssignment._id }, { active: false }),
        ].filter(Boolean));

        const accepterEntry = new Assignment({
            shiftData: {
                team: demand.posterShift.teamId,
                shift: demand.posterShift.shift,
                selectedVariation: demand.posterShift.selectedVariation,
            },
            subType: 'substitution',
            substitution: {
                id: demand._id,
                savedEntry: latestAccepterAssignment?._id,
            },
            userId: demand.accepterId,
            date: dateStr,
            centerId: demand.centerId,
        });

        const posterEntry = new Assignment({
            shiftData: null,
            subType: 'substitution',
            substitution: {
                id: demand._id,
                savedEntry: latestPosterAssignment?._id,
            },
            userId: demand.posterId,
            date: dateStr,
            centerId: demand.centerId,
        });


        await accepterEntry.save();
        await posterEntry.save();

        const [posterShifts, accepterShifts] = await Promise.all([
            computeUserShifts([posterDayOf(demand)], demand.posterId),
            computeUserShifts([posterDayOf(demand)], demand.accepterId),
        ]);

        return {
            posterShift: posterShifts[0],
            accepterShift: accepterShifts[0],
            updatedDemands: null,
            type: 'substitution',
        };

    } catch (err) {
        throw new AppError("Erreur lors de l'ajout des entrées de substitution", 500);
    }
}



// calendarEntryService.js
/**
 * Désactive les entrées de calendrier créées par une substitution (et celles qui les suivent) pour l'auteur
 * et l'accepteur.
 * @param {string} demandId
 * @param {{ posterId, accepterId, date: Date }} params
 * @param {Object} [opts]
 * @param {ClientSession} [opts.session] - lectures et écritures dans la transaction. Dans ce cas les vacations
 *   recalculées ne sont pas retournées (`posterShift` / `accepterShift` = null) : computeUserShifts ne lit pas
 *   dans la session et verrait l'état d'avant les écritures ; à recalculer après le commit.
 */
export async function cancelSubstitutionEntries (demandId, { posterId, accepterId, date }, { session } = {}) {
    const dateStr = toDateKey(date);

    try {

        const findSubEntry = (userId) => Assignment.findOne({
            userId,
            date: dateStr,
            active: true,
            subType: 'substitution',
            'substitution.id': demandId,
        }, null, { sort: { createdAt: -1 }, session });

        const [posterSubEntry, accepterSubEntry] = await Promise.all([
            findSubEntry(posterId),
            findSubEntry(accepterId),
        ]);

        const cancelAfter = async (userId, subEntry) => {
            if (!subEntry) return;
            await Promise.all([
                Assignment.updateMany(
                    { userId, date: dateStr, active: true, createdAt: { $gte: subEntry.createdAt } },
                    { active: false },
                    { session }
                ),
                Modification.updateMany(
                    { userId, date: dateStr, active: true, createdAt: { $gte: subEntry.createdAt } },
                    { active: false },
                    { session }
                ),
                HourPatch.updateMany(
                    { userId, date: dateStr, active: true, createdAt: { $gte: subEntry.createdAt } },
                    { active: false },
                    { session }
                ),
            ]);
        };

        await Promise.all([
            cancelAfter(posterId, posterSubEntry),
            cancelAfter(accepterId, accepterSubEntry),
        ]);

        if (session) {
            return { posterShift: null, accepterShift: null, updatedDemands: null, type: 'restoration' };
        }

        const [posterShift, accepterShift] = await Promise.all([
            computeUserShifts([date], posterId),
            computeUserShifts([date], accepterId),
        ]);

        return {
            posterShift: posterShift[0],
            accepterShift: accepterShift[0],
            updatedDemands: null,
            type: 'restoration',
        };
    } catch (error) {
        // Conserve l'étiquette TransientTransactionError (WriteConflict…) pour que withTransaction réessaie
        if (error?.hasErrorLabel?.('TransientTransactionError')) throw error;
        throw new AppError("Erreur lors de l'annulation des entrées de substitution", 500);
    }
}

/**
 * Récupère les modifications d'un utilisateur, avec filtres optionnels.
 */
export async function getUserEntries (userId, date) {
    const query = { userId };

    if (date) {
        query.date = new Date(date);
    }

    return CalendarEntry.find(query)
        .populate('userId', 'name lastName email')
        .populate('centerId', 'name')
        .populate({ path: 'shiftData.shift' })
        .populate({ path: 'shiftData.selectedVariation' })
        .sort({ date: 1, createdAt: -1 });
}



export async function undoMods (userId, date) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const initialShift = await computeUserShifts([date], userId);

    cancelModifications(userId, date);
    cancelAssignments(userId, date);
    cancelHourPatches(userId, date);

    const userShift = await computeUserShifts([date], userId);

    return { userShift, updatedDemands: null, type: "restoration" };
}



export async function deleteAssignment (userId, date) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const latestAssignment = await Assignment.findOne({ userId, date, active: true }).sort({ createdAt: -1 });
    if (!latestAssignment) {
        throw new AppError('Aucune entrée trouvée', 404);
    }

    if (latestAssignment.subType === "substitution") {
        throw new AppError('Vous ne pouvez pas directement supprimer une vacation qui est un remplacement, annulez d\'abord la demande', 400);
    }

    latestAssignment.active = false;
    await latestAssignment.save();

    await Promise.all([
        Modification.updateMany(
            { userId, date, active: true, createdAt: { $gte: latestAssignment.createdAt } },
            { active: false }
        ),
        HourPatch.updateMany(
            { userId, date, active: true, createdAt: { $gte: latestAssignment.createdAt } },
            { active: false }
        ),
    ]);

    const userShift = await computeUserShifts([date], userId);

    return { userShift, updatedDemands: null, type: "restoration" };
}

// const checkOverlap = (latestAssignment, userShift, data) => {
//     let overlapResult = false;
//     let hasShift = false;
//     if (latestAssignment) {
//         if (latestAssignment.shiftData?.shift && latestAssignment.shiftData?.shift?.type === "work") {
//             hasShift = true;
//         }

//         if (!latestAssignment.startTime || !latestAssignment.endTime) {
//             overlapResult = false;
//         } else {
//             overlapResult = overlap(latestAssignment, { startTime: data.startTime, endTime: data.endTime, date: data.date })
//         }

//     } else {
//         if (userShift[0].shiftData?.shift && userShift[0].shiftData?.shift?.type === "work") {
//             hasShift = true;
//         }
//         if (!userShift[0].startTime || !userShift[0].endTime) {
//             overlapResult = false;
//         } else {
//             overlapResult = overlap(userShift[0], { startTime: data.startTime, endTime: data.endTime, date: data.date })
//         }

//     }

//     return { hasShift, overlapResult };
// }