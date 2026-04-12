import { CalendarEntry, Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { computeShiftOfUserWithSubstitutions } from '../../utils/computeShiftOfUserWithSubstitutions.js';
import { AppError } from '../../error/AppError.js';
import * as demandMutationsService from '../substitution/index.js';
import overlap from '../../utils/overlapTest.js';

/**
 * Met à jour posterShift.selectedVariation des demandes ouvertes du user pour la date donnée.
 * Retourne la demande mise à jour ou null.
 */

export async function syncDemandSelectedVariation (userId, date, selectedVariationId) {
    const demands = await Substitution.find({
        $or: [
            { posterId: userId },
            { accepterId: userId }
        ],
        'posterShift.date': date,
        deleted: false,
        status: { $in: ['open', 'accepted'] }
    }).lean();

    if (!demands.length) return null;

    const bulkOps = demands.map((demand) => {
        const isOpen = demand.status === 'open';
        const isPoster = demand.posterId.toString() === userId.toString();

        const field = isOpen || isPoster
            ? 'posterShift.selectedVariation'
            : 'accepterShift.selectedVariation';

        return {
            updateOne: {
                filter: { _id: demand._id },
                update: { $set: { [field]: selectedVariationId, updatedAt: new Date() } }
            }
        };
    });

    await Substitution.bulkWrite(bulkOps);

    return Substitution.find({ _id: { $in: demands.map(d => d._id) } })
        .populate({ path: 'posterShift.shift', populate: { path: 'variations' } })
        .populate({ path: 'accepterShift.shift', populate: { path: 'variations' } })
        .lean();
}

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

const checkOverlap = (latestAssignment, userShift, data) => {
    let overlapResult = false;
    let hasShift = false;
    if (latestAssignment) {
        if (latestAssignment.shiftData?.shift && latestAssignment.shiftData?.shift?.type === "work") {
            hasShift = true;
        }

        if (!latestAssignment.startTime || !latestAssignment.endTime) {
            overlapResult = false;
        } else {
            overlapResult = overlap(latestAssignment, { startTime: data.startTime, endTime: data.endTime, date: data.date })
        }

    } else {
        if (userShift[0].shiftData?.shift && userShift[0].shiftData?.shift?.type === "work") {
            hasShift = true;
        }
        if (!userShift[0].startTime || !userShift[0].endTime) {
            overlapResult = false;
        } else {
            overlapResult = overlap(userShift[0], { startTime: data.startTime, endTime: data.endTime, date: data.date })
        }

    }

    return { hasShift, overlapResult };

}

export async function registerEntry (userId, date, data) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

    const [userShift, substitution, latestAssignment, latestModification, latestHourPatch] = await Promise.all([
        computeShiftOfUserWithSubstitutions([date], userId),
        Substitution.findOne({ $or: [{ posterId: userId }, { accepterId: userId }], "posterShift.date": date, status: { $in: ['open', 'accepted'] } }).sort({ createdAt: -1 }),
        Assignment.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
        Modification.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
        HourPatch.findOne({ userId, date, active: true }).sort({ createdAt: -1 }),
    ]);

    const recomputeShift = () => computeShiftOfUserWithSubstitutions([date], userId);
    const buildResult = async (type) => ({ userShift: await recomputeShift(), updatedDemands: null, type });

    switch (data.type) {
        case 'assignment': {
            data.startTime = '09:00';
            data.endTime = '17:00';
            data.date = date;

            if (data.cancel && data.entryType === 'absence') {
                cancelAssignment(latestAssignment);
                cancelModifications(userId, date);
                return buildResult('assignment');
            }

            if (latestAssignment && latestAssignment.subType === 'substitution') {
               throw new AppError('Impossible de créer une entrée sur un remplacement actif', 422);
            }

            if (substitution) {
                throw new AppError('Impossible de créer une entrée si une demande est en cours ce jour', 409);
            }

            cancelModifications(userId, date);
            cancelHourPatches(userId, date);
            break;
        }
        case 'modification':
            if (latestModification) {
                latestModification.active = false;
                await latestModification.save();
            }
            cancelHourPatches(userId, date);
            break;

        case 'hourPatch':
            if (latestHourPatch) {
                latestHourPatch.active = false;
                await latestHourPatch.save();
            }
            break;
    }

    if (data.type === 'hourPatch') {
        const hourPatch = new HourPatch({
            userId,
            date,
            centerId: user.centerId,
            adjustedTime: { adjustedStart: 1, adjustedEnd: 2 },
        });
        await hourPatch.save();
        return buildResult('hourPatch');
    }

    if (data.entryType === 'disp' && data.cancel) {
        const entry = new CalendarEntry({
            type: data.type,
            subType: 'pres',
            shiftData: {
                shift: data.shift,
                selectedVariation: data.selectedVariation,
                team: data.team,
            },
            userId,
            date,
            centerId: user.centerId,
            startTime: data.startTime,
            endTime: data.endTime,
        });
        await entry.save();
        return buildResult('disp');
    }

    const entry = new CalendarEntry({
        type: data.type,
        subType: data.entryType,
        shiftData: {
            shift: data.shift,
            selectedVariation: data.selectedVariation,
            team: data.team,
        },
        userId,
        date,
        centerId: user.centerId,
        startTime: data.startTime,
        endTime: data.endTime,
    });
    await entry.save();

    // const updatedDemands = await syncDemandSelectedVariation(userId, date, data.selectedVariation);

    return buildResult('creation');
}

export async function restoreInitialShift (userId, date) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

    const initialShift = await computeShiftOfUserWithSubstitutions([date], userId);

    cancelModifications(userId, date);
    cancelAssignments(userId, date);
    cancelHourPatches(userId, date);

    const userShift = await computeShiftOfUserWithSubstitutions([date], userId);

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
            computeShiftOfUserWithSubstitutions([demand.posterShift.date], demand.posterId),
            computeShiftOfUserWithSubstitutions([demand.posterShift.date], demand.accepterId),
        ]);

        return {
            posterShift: posterShifts[0],
            accepterShift: accepterShifts[0],
            updatedDemands: null,
            type: 'substitution',
        };

    } catch (error) {
        // 5. Preserve original error for logging, throw operational error for the caller
        console.error("❌ Erreur lors de l'ajout des entrées de substitution:", error);
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
            computeShiftOfUserWithSubstitutions([date], posterId),
            computeShiftOfUserWithSubstitutions([date], accepterId),
        ]);

        return {
            posterShift: posterShift[0],
            accepterShift: accepterShift[0],
            updatedDemands: null,
            type: 'restoration',
        };
    } catch (error) {
        console.error("❌ Erreur lors de l'annulation des entrées de substitution:", error);
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

/**
 * Récupère une modification spécifique par son id, en vérifiant les droits d'accès.
 */
export async function getModificationById (id, requestingUserId) {
    const modification = await CalendarEntry.findById(id)
        .populate('userId', 'name lastName email')
        .populate('centerId', 'name')

        .populate('shift');

    if (!modification) {
        const err = new Error('Modification non trouvée');
        err.status = 404;
        throw err;
    }

    const user = await User.findById(requestingUserId);
    if (!user.isAdmin && modification.userId.toString() !== requestingUserId) {
        const err = new Error('Vous n\'avez pas les droits pour voir cette modification');
        err.status = 403;
        throw err;
    }

    return modification;
}


