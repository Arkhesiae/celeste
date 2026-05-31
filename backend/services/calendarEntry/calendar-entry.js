import { CalendarEntry, Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { computeUserShifts } from '../../utils/computeUserShifts.js';
import { AppError } from '../../error/appError.js';
import * as demandMutationsService from '../substitution/index.js';
import overlap from '../../utils/overlapTest.js';

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
    const isPoster = demand?.posterId.toString() === assignment?.userId.toString();
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
    userShift?.[0]?.shiftData?.shift?._id.toString() === data.shiftId.toString();


export async function registerEntry (userId, date, data) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

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
        Substitution.findOne({ $or: [{ posterId: userId }, { accepterId: userId }], "posterShift.date": date, status: { $in: ['open', 'accepted'] } }).sort({ createdAt: -1 }),
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

    const userShift = await computeUserShifts([date], user._id);
    const isSameShift = (userShift, data) => userShift[0].shiftData?.shift?._id.toString() === data.shiftId.toString();

    if (!isSameShift(userShift, data)) {
        throw new AppError('Impossible de créer une MDDA car le shift ne correspond pas', 422);
    }

    const entry = new HourPatch({
        userId: user._id,
        subType: 'mdda',
        date,
        adjustedTime: {
            adjustedStart: 1,
            adjustedEnd: 2,
        },
        centerId: user.centerId,
        shiftData: {
            shift: data.shiftId,
            selectedVariation: data.selectedVariation,
            team: data.team,
        },
    });

    await entry.save();
    return { userShift: await recomputeShift(), updatedDemands: null, type: 'creation' };
}



async function registerMDDA (userId, date, data) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    const userShift = await computeUserShifts([date], userId);
    const isSameShift = (userShift, data) => userShift[0].shiftData?.shift?._id.toString() === data.shiftId.toString();

    if (!isSameShift(userShift, data)) {
        throw new AppError('Impossible de créer une MDDA car le shift ne correspond pas', 422);
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
            selectedVariation: data.selectedVariation,
            team: data.team,
        },
    });
    await mdda.save();
}

export async function restoreInitialShift (userId, date) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

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
        const dateStr = demand.posterShift.date.toISOString().split('T')[0];

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
            computeUserShifts([demand.posterShift.date], demand.posterId),
            computeUserShifts([demand.posterShift.date], demand.accepterId),
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
export async function cancelSubstitutionEntries (demandId, { posterId, accepterId, date }) {
    const dateStr = date.toISOString().split('T')[0];

    try {

        const findSubEntry = (userId) => Assignment.findOne({
            userId,
            date: dateStr,
            active: true,
            subType: 'substitution',
            'substitution.id': demandId,
        }, null, { sort: { createdAt: -1 } });

        const [posterSubEntry, accepterSubEntry] = await Promise.all([
            findSubEntry(posterId),
            findSubEntry(accepterId),
        ]);

        const cancelAfter = async (userId, subEntry) => {
            if (!subEntry) return;
            await Promise.all([
                Assignment.updateMany(
                    { userId, date: dateStr, active: true, createdAt: { $gte: subEntry.createdAt } },
                    { active: false }
                ),
                Modification.updateMany(
                    { userId, date: dateStr, active: true, createdAt: { $gte: subEntry.createdAt } },
                    { active: false }
                ),
                HourPatch.updateMany(
                    { userId, date: dateStr, active: true, createdAt: { $gte: subEntry.createdAt } },
                    { active: false }
                ),
            ]);
        };

        await Promise.all([
            cancelAfter(posterId, posterSubEntry),
            cancelAfter(accepterId, accepterSubEntry),
        ]);

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
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

    const initialShift = await computeUserShifts([date], userId);

    cancelModifications(userId, date);
    cancelAssignments(userId, date);
    cancelHourPatches(userId, date);

    const userShift = await computeUserShifts([date], userId);

    return { userShift, updatedDemands: null, type: "restoration" };
}



export async function deleteAssignment (userId, date) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

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