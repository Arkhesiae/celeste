import PlanningModification from '../../models/CalendarEntry.js';
import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { computeShiftOfUserWithSubstitutions } from '../../utils/computeShiftOfUserWithSubstitutions.js';
import { AppError } from '../../error/appError.js';

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



/**
 * Crée ou met à jour une modification de planning pour un utilisateur à une date donnée.
 */
export async function upsertModification (userId, date, data) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

    let modification = await PlanningModification.findOne({ userId, date });

    if (modification) {
        Object.assign(modification, data);
        modification.updatedAt = new Date();
    } else {
        modification = new PlanningModification({
            ...data,
            userId,
            date: date,
            centerId: user.centerId,

        });
    }

    await modification.save();

    const updatedDemands = await syncDemandSelectedVariation(userId, date, data.selectedVariation);

    const userShift = await computeShiftOfUserWithSubstitutions([date], userId);

    return { userShift, updatedDemands };
}

export async function registerEntry (userId, date, data) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

    const latestEntry = await PlanningModification.findOne({ userId, date }).sort({ createdAt: -1 });
    // if (data.type === "shiftVariation" || data.type === "absence") {
    //     // If the user is modifying the same shift, just update the latest entry
    //     if (latestEntry?.shiftData?.shift && data.shift && latestEntry.shiftData.shift.toString() === data.shift.toString()) {
    //         latestEntry.shiftData.selectedVariation = data.selectedVariation;
    //         latestEntry.type = data.type;
    //         latestEntry.isOff = data.isOff;
    //         latestEntry.updatedAt = new Date();
    //         await latestEntry.save();
    //         const userShift = await computeShiftOfUserWithSubstitutions([date], userId);
    //         return { userShift, updatedDemands: null, type: "modification" };
    //     }

    // } else
    // if (!data.confirmCreation ) {
    //     // Ask if user wants to overwrite with a new entry
    //     const err = new Error('Une entrée existe déjà pour cette date. Cela va créer une toute nouvelle entrée.');
    //     err.status = 409;
    //     throw err;
    // }


    const entry = new PlanningModification({
        type: data.type,
        shiftData: {
            shift: data.shift,
            selectedVariation: data.selectedVariation,
        },
        isOff: data.isOff,
        userId,
        date: date,
        centerId: user.centerId,
        startTime: "09:00",
        endTime: "17:00",

    });

    await entry.save();

    // const updatedDemands = await syncDemandSelectedVariation(userId, date, data.selectedVariation);

    const userShift = await computeShiftOfUserWithSubstitutions([date], userId);

    return { userShift, updatedDemands: null, type: "creation" };
}

export async function restoreInitialShift (userId, date) {
    const user = await User.findById(userId);
    if (!user) {
        const err = new Error('Utilisateur non trouvé');
        err.status = 404;
        throw err;
    }

    // Get the initial shift for the user on the given date
    const initialShift = await computeShiftOfUserWithSubstitutions([date], userId);


    const entry = new PlanningModification({
        type: "restoration",
        shiftData: {
            shift: initialShift[0].initialShift,
            selectedVariation: null
        },
        isOff: false,
        userId,
        date: date,
        centerId: user.centerId,

    });

    await entry.save();

    const userShift = await computeShiftOfUserWithSubstitutions([date], userId);

    return { userShift, updatedDemands: null, type: "restoration" };
}

export async function addSubstitutionEntries (demand) {
    try {
        if (!demand) {
            throw new AppError('Demande invalide', 400);
        }

        const entry = new PlanningModification({
            type: "substitution",
            shiftData: {
                shift: demand.posterShift.shift,
                selectedVariation: demand.posterShift.selectedVariation,
            },
            substitutionId : demand._id,
            userId: demand.accepterId,
            date: demand.posterShift.date,
            centerId: demand.centerId,

        });

        // Add entry for the poster

        const entry2 = new PlanningModification({
            type: "substitution",
            shiftData: {
                shift: demand.posterShift.shift,
                selectedVariation: demand.posterShift.selectedVariation,
            },
            isOff: true,
            substitutionId : demand._id,
            userId: demand.posterId,
            date: demand.posterShift.date,
            centerId: demand.centerId,

        });

        await Promise.all([entry.save(), entry2.save()]);
        const posterShift = await computeShiftOfUserWithSubstitutions([demand.posterShift.date], demand.posterId);
        const accepterShift = await computeShiftOfUserWithSubstitutions([demand.posterShift.date], demand.accepterId);

        return { posterShift: posterShift[0], accepterShift: accepterShift[0], updatedDemands: null, type: "substitution" };
    } catch (error) {
        console.log(error);
        throw new AppError('Erreur lors de l\'ajout des entrées de substitution', 500);
    }
}



export async function restoreBeforeSubstitution (demandId) {
    const demand = await Substitution.findById(demandId);
    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }

    async function getLastNonSubstitutionEntry (userId, date) {
        const entries = await PlanningModification
            .find({ userId, date })
            .sort({ createdAt: -1 });
        return entries.find(e => e.substitutionId?.toString() !== demand._id.toString()) ?? null;
    }

    const [accepterEntry, posterEntry] = await Promise.all([
        getLastNonSubstitutionEntry(demand.accepterId, demand.posterShift.date),
        getLastNonSubstitutionEntry(demand.posterId, demand.posterShift.date)
    ]);

    if (accepterEntry) {
        const entry = new PlanningModification({
            type: "restoration",
            shiftData: {
                shift: accepterEntry.shiftData.shift,
                selectedVariation: accepterEntry.shiftData.selectedVariation,
            },
            userId: accepterEntry.userId,
            date: accepterEntry.date,
            centerId: accepterEntry.centerId,
        });
        await entry.save();
    } else {
        await restoreInitialShift(demand.accepterId, demand.posterShift.date);
    }

    if (posterEntry) {
        const entry = new PlanningModification({
            type: "restoration",
            shiftData: {
                shift: posterEntry.shiftData.shift,
                selectedVariation: posterEntry.shiftData.selectedVariation,
            },
            userId: posterEntry.userId,
            date: posterEntry.date,
            centerId: posterEntry.centerId,
        });
        await entry.save();
    } else {
        await restoreInitialShift(demand.posterId, demand.posterShift.date);
    }

    const [posterShift, accepterShift] = await Promise.all([
        computeShiftOfUserWithSubstitutions([demand.posterShift.date], demand.posterId),
        computeShiftOfUserWithSubstitutions([demand.posterShift.date], demand.accepterId)
    ]);

    return { posterShift: posterShift[0], accepterShift: accepterShift[0], updatedDemands: null, type: "restoration" };
}

/**
 * Récupère les modifications d'un utilisateur, avec filtres optionnels.
 */
export async function getUserEntries (userId, date) {
    const query = { userId };

    if (date) {
        query.date = new Date(date);
    }

    return PlanningModification.find(query)
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
    const modification = await PlanningModification.findById(id)
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

/**
 * Supprime une modification de planning (uniquement par son propriétaire, et seulement pour une date future).
 */
export async function removeModification (id, userId) {
    const modification = await PlanningModification.findById(id);
    if (!modification) {
        const err = new Error('Modification non trouvée');
        err.status = 404;
        throw err;
    }

    if (modification.userId.toString() !== userId) {
        const err = new Error('Vous n\'avez pas les droits pour supprimer cette modification');
        err.status = 403;
        throw err;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (modification.date < today) {
        const err = new Error('Impossible de supprimer une modification pour une date passée');
        err.status = 400;
        throw err;
    }

    const modDate = modification.date;
    await PlanningModification.findByIdAndDelete(id);

    const updatedDemand = await syncDemandSelectedVariation(userId, modDate, null);
    return { updatedDemand };
}

/**
 * Met à jour une modification existante (uniquement par son propriétaire, et seulement pour une date future).
 */
export async function patchModification (id, userId, { selectedVariation, shift, comment, isOff, type }) {
    const modification = await PlanningModification.findById(id);
    if (!modification) {
        const err = new Error('Modification non trouvée');
        err.status = 404;
        throw err;
    }

    if (modification.userId.toString() !== userId) {
        const err = new Error('Vous n\'avez pas les droits pour modifier cette demande');
        err.status = 403;
        throw err;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (modification.date < today) {
        const err = new Error('Impossible de modifier une modification pour une date passée');
        err.status = 400;
        throw err;
    }

    if (selectedVariation !== undefined) modification.selectedVariation = selectedVariation;
    if (shift !== undefined) modification.shift = shift;
    if (comment !== undefined) modification.comment = comment;
    if (isOff !== undefined) modification.isOff = isOff;
    if (type !== undefined) modification.type = type;

    modification.updatedAt = new Date();
    await modification.save();

    const updatedDemand = await syncDemandSelectedVariation(userId, modification.date, modification.selectedVariation);

    await modification.populate('userId', 'name lastName email');
    await modification.populate('centerId', 'name');
    await modification.populate('teamId', 'name');
    await modification.populate('selectedVariation');
    await modification.populate('shift');

    return { modification, updatedDemand };
}
