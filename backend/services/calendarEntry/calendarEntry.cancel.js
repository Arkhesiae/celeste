/**
 * Annulation (désactivation) des entrées de calendrier d'un utilisateur : modifications, affectations, ajustements
 * d'horaires, retour à la vacation initiale, et entrées créées par une substitution.
 * Les entrées sont désactivées (`active: false`), jamais supprimées.
 */
import { Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import { toDateKey } from '../../utils/dates/dateKey.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { computeUserShifts } from '../planning/computeUserShifts.js';
import { AppError } from '../../error/AppError.js';
import { cancelRequest } from '../substitution/request.cancel.js';
import { withdrawFromRequest } from '../substitution/request.withdraw.js';

export async function cancelModifications (userId, date) {
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
        cancelRequest(demand._id);
    } else {
        withdrawFromRequest(demand._id, assignment.userId.toString());
    }
}

export async function cancelHourPatches (userId, date) {
    const hourPatches = await HourPatch.find({ userId, date, active: true });
    hourPatches.forEach((hourPatch) => {
        hourPatch.active = false;
        hourPatch.save();
    });
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

        // Opérations l'une après l'autre : dans une transaction, des opérations concurrentes sur la même session
        // peuvent échouer (NoSuchTransaction), voir known issue #48
        const posterSubEntry = await findSubEntry(posterId);
        const accepterSubEntry = await findSubEntry(accepterId);

        const cancelAfter = async (userId, subEntry) => {
            if (!subEntry) return;
            const sinceSubstitution = { userId, date: dateStr, active: true, createdAt: { $gte: subEntry.createdAt } };
            await Assignment.updateMany(sinceSubstitution, { active: false }, { session });
            await Modification.updateMany(sinceSubstitution, { active: false }, { session });
            await HourPatch.updateMany(sinceSubstitution, { active: false }, { session });
        };

        await cancelAfter(posterId, posterSubEntry);
        await cancelAfter(accepterId, accepterSubEntry);

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
