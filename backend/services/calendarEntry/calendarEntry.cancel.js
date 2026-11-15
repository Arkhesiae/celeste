/**
 * Annulation (désactivation) des entrées de calendrier d'un utilisateur : modifications, affectations, ajustements
 * d'horaires, retour à la vacation initiale, et entrées créées par une substitution.
 * Les entrées sont désactivées (`active: false`), jamais supprimées.
 */
import { Assignment, Modification, HourPatch } from '../../models/CalendarEntry.js';
import { toDateKey } from '../../utils/dates/dateKey.js';
import { findOrThrow } from '../../utils/mongo.js';
import User from '../../models/User.js';
import { computeUserShifts } from '../planning/planning.userShifts.js';
import { AppError } from '../../error/AppError.js';

const ENTRY_MODELS = { assignment: Assignment, modification: Modification, hourPatch: HourPatch };
const ALL_KINDS = Object.keys(ENTRY_MODELS);

/**
 * Désactive les entrées actives d'un utilisateur pour un jour. Seule porte d'écriture de ces annulations : elle attend
 * chaque écriture, l'appelant recalcule la vacation juste après.
 * @param {string} userId
 * @param {string} date - jour `YYYY-MM-DD`
 * @param {Array<'assignment'|'modification'|'hourPatch'>} kinds
 * @param {Object} [opts]
 * @param {Date} [opts.since] - seulement les entrées créées à cet instant ou après (ce qui suit un remplacement)
 * @param {boolean} [opts.keepSubstitutions] - ne touche pas aux affectations `substitution` : elles ne s'annulent qu'avec leur demande
 * @param {ClientSession} [opts.session]
 */
export async function deactivateEntries (userId, date, kinds, { since, keepSubstitutions = false, session } = {}) {
    // L'une après l'autre : dans une transaction, des opérations concurrentes sur la même session peuvent échouer
    // (NoSuchTransaction), voir known issue #48
    for (const kind of kinds) {
        const filter = { userId, date, active: true };
        if (since) filter.createdAt = { $gte: since };
        if (keepSubstitutions && kind === 'assignment') filter.subType = { $ne: 'substitution' };
        await ENTRY_MODELS[kind].updateMany(filter, { active: false }, { session });
    }
}

/** Retour au planning initial : désactive modifications, ajustements d'horaires et affectations (sauf remplacements) du jour */
export async function restoreInitialShift (userId, date) {
    await deactivateEntries(userId, date, ALL_KINDS, { keepSubstitutions: true });

    const userShift = await computeUserShifts([date], userId);

    return { userShift, updatedDemands: null, type: "restoration" };
}

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
            await deactivateEntries(userId, dateStr, ALL_KINDS, { since: subEntry.createdAt, session });
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

export async function deleteAssignment (userId, date) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const latestAssignment = await Assignment.findOne({ userId, date, active: true }).sort({ createdAt: -1 });
    if (!latestAssignment) {
        throw new AppError('Aucune entrée trouvée', 404);
    }

    if (latestAssignment.subType === "substitution") {
        throw new AppError('Vous ne pouvez pas directement supprimer une vacation qui est un remplacement, annulez d\'abord la demande', 400);
    }

    // L'affectation et ce qui l'a suivie (modifications, ajustements d'horaires)
    await deactivateEntries(userId, date, ALL_KINDS, { since: latestAssignment.createdAt });

    const userShift = await computeUserShifts([date], userId);

    return { userShift, updatedDemands: null, type: "restoration" };
}
