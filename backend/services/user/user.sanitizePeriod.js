import { inTransaction } from '../../utils/mongo.js';
import { fullName } from '../../utils/names.js';
import { sameId } from '../../utils/ids.js';
import Substitution from '../../models/Substitution.js';
import { CalendarEntry } from '../../models/CalendarEntry.js';
import { AppError } from '../../error/AppError.js';
import { toDateKey } from '../../utils/dates/dateKey.js';
import {
    cancelRequestWithSession,
    withdrawFromRequestWithSession,
} from '../substitution/request.internal.js';

/**
 * Helpers pour "assainir" une période d'un utilisateur (ex. après un changement d'équipe) :
 *  - cancelUserSubstitutionsInPeriod : annule / se désiste de ses substitutions
 *  - clearUserCalendarEntriesInPeriod : désactive ses entrées de calendrier liées aux vacations
 *  - sanitizeUserPeriod : les deux, dans une même transaction
 *
 * Période : { from, to } — `from` obligatoire, `to` optionnel (absent = sans limite de fin).
 * Les deux bornes sont incluses. Date | 'YYYY-MM-DD' | ISO string acceptés.
 *
 * Toutes les fonctions acceptent `{ session }` ; sans session elles ouvrent leur propre transaction.
 * Aucun email n'est envoyé (contrairement au désistement déclenché par l'utilisateur).
 */

const requireDateKey = (value, label) => {
    const key = toDateKey(value);
    if (!key) throw new AppError(`Période invalide : "${label}" n'est pas une date valide.`, 400);
    return key;
};

/**
 * @returns {{ fromKey: string, toKey: string|null, fromDate: Date, toDate: Date|null }}
 *   clés YYYY-MM-DD (entrées de calendrier) et bornes Date UTC (substitutions)
 */
export function normalizePeriod ({ from, to } = {}) {
    const fromKey = requireDateKey(from, 'from');
    const endKey = to == null || to === '' ? null : requireDateKey(to, 'to');

    if (endKey && endKey < fromKey) {
        throw new AppError('Période invalide : "to" est antérieur à "from".', 400);
    }

    return {
        fromKey,
        toKey: endKey,
        fromDate: new Date(`${fromKey}T00:00:00.000Z`),
        toDate: endKey ? new Date(`${endKey}T23:59:59.999Z`) : null,
    };
}

/** Demandes ouvertes/acceptées de l'utilisateur (auteur ou accepteur) dont une des dates est dans la période. */
const periodSubstitutionsQuery = (userId, { fromDate, toDate }) => {
    const dateRange = toDate ? { $gte: fromDate, $lte: toDate } : { $gte: fromDate };
    return {
        deleted: { $ne: true },
        status: { $in: ['open', 'accepted'] },
        $or: [{ posterId: userId }, { accepterId: userId }],
        $and: [{ $or: [{ 'posterShift.date': dateRange }, { 'accepterShift.date': dateRange }] }],
    };
};

/** Entrées de calendrier actives de l'utilisateur liées à une vacation dans la période. */
const periodEntriesQuery = (userId, { fromKey, toKey: endKey }) => ({
    userId,
    active: true,
    date: endKey ? { $gte: fromKey, $lte: endKey } : { $gte: fromKey },
    'shiftData.shift': { $ne: null },
});

/**
 * Annule les demandes dont l'utilisateur est l'auteur (cascade incluse) et se désiste de celles
 * qu'il a acceptées, dès que la date de sa vacation ou celle de la vacation échangée est dans la période.
 *
 * @param {string|ObjectId} userId
 * @param {{ from: Date|string, to?: Date|string }} period
 * @param {Object} [opts]
 * @param {ClientSession} [opts.session]
 * @param {string} [opts.reason='system-cancelled'] - statut posé sur les demandes annulées
 * @returns {Promise<{ cancelled: string[], withdrawn: string[] }>}
 *   cancelled : ids annulés (y compris par cascade) ; withdrawn : ids dont l'utilisateur s'est désisté
 */
export async function cancelUserSubstitutionsInPeriod (userId, period, { session, reason = 'system-cancelled' } = {}) {
    const normalized = normalizePeriod(period);
    const uid = userId.toString();

    return inTransaction(async (activeSession) => {
        const candidates = await Substitution.find(periodSubstitutionsQuery(userId, normalized))
            .select('_id').session(activeSession);

        const cancelledRequests = [];
        const withdrawn = [];

        for (const { _id } of candidates) {
            // Relecture : une annulation en cascade précédente a pu changer l'état de cette demande
            const request = await Substitution.findById(_id)
                .select('status posterId accepterId')
                .session(activeSession);
            if (!request || !['open', 'accepted'].includes(request.status)) continue;

            if (sameId(request.posterId, uid)) {
                await cancelRequestWithSession(_id, { session: activeSession, cancelledRequests, reason });
            } else if (request.accepterId?.toString() === uid && request.status === 'accepted') {
                await withdrawFromRequestWithSession(_id, userId, { session: activeSession, cancelledRequests });
                withdrawn.push(_id.toString());
            }
        }

        return {
            cancelled: [...new Set(cancelledRequests.map((r) => r._id.toString()))],
            withdrawn,
        };
    }, { session });
}

/**
 * Désactive (`active: false`, convention du projet — pas de suppression) toutes les entrées de calendrier
 * de l'utilisateur liées à une vacation (`shiftData.shift` renseigné : modifications, hour patches et
 * affectations adossées à une vacation) dans la période.
 * Les affectations sans vacation (absence, formation aux horaires libres…) sont conservées.
 *
 * @param {string|ObjectId} userId
 * @param {{ from: Date|string, to?: Date|string }} period
 * @param {Object} [opts]
 * @param {ClientSession} [opts.session]
 * @returns {Promise<{ deactivated: number }>}
 */
export async function clearUserCalendarEntriesInPeriod (userId, period, { session } = {}) {
    const result = await CalendarEntry.updateMany(
        periodEntriesQuery(userId, normalizePeriod(period)),
        { $set: { active: false } },
        { session }
    );

    return { deactivated: result.modifiedCount };
}

/**
 * Aperçu en lecture seule de ce que ferait `sanitizeUserPeriod` (rien n'est modifié) : demandes qui seraient
 * annulées ou dont l'utilisateur se désisterait (y compris les demandes dépendantes annulées en cascade),
 * et entrées de calendrier qui seraient désactivées.
 *
 * @param {string|ObjectId} userId
 * @param {{ from: Date|string, to?: Date|string }} period
 * @returns {Promise<{
 *   substitutions: Array<{ id: string, action: 'cancel'|'withdraw', cascade: boolean, type: string, status: string,
 *                          date: string|null, accepterDate: string|null, poster: string, accepter: string|null }>,
 *   entries: Array<{ id: string, date: string, type: string, subType: string }>
 * }>}
 */
export async function previewUserPeriodImpact (userId, period) {
    const normalized = normalizePeriod(period);
    const uid = userId.toString();
    const populate = [{ path: 'posterId', select: 'name lastName' }, { path: 'accepterId', select: 'name lastName' }];

    const direct = await Substitution.find(periodSubstitutionsQuery(userId, normalized)).populate(populate);

    const byId = new Map();
    const describe = (request, action, cascade) => {
        byId.set(request._id.toString(), {
            id: request._id.toString(),
            action,
            cascade,
            type: request.type,
            status: request.status,
            date: toDateKey(request.posterShift?.date),
            accepterDate: toDateKey(request.accepterShift?.date),
            poster: fullName(request.posterId) || null,
            accepter: fullName(request.accepterId) || null,
        });
    };

    // Même règle que cancelUserSubstitutionsInPeriod : auteur → annulation ; accepteur d'une demande acceptée → désistement
    const queue = [];
    for (const request of direct) {
        if (request.posterId?._id?.toString() === uid) {
            describe(request, 'cancel', false);
            queue.push(request._id);
        } else if (request.accepterId?._id?.toString() === uid && request.status === 'accepted') {
            describe(request, 'withdraw', false);
            queue.push(request._id);
        }
    }

    // Annulations en cascade (demandes dépendantes), à tout niveau
    while (queue.length) {
        const parentId = queue.shift();
        const children = await Substitution.find({ dependsOn: parentId }).populate(populate);
        for (const child of children) {
            if (byId.has(child._id.toString())) continue;
            describe(child, 'cancel', true);
            queue.push(child._id);
        }
    }

    const entries = await CalendarEntry.find(periodEntriesQuery(userId, normalized)).sort({ date: 1 });

    return {
        substitutions: [...byId.values()],
        entries: entries.map((entry) => ({
            id: entry._id.toString(),
            date: entry.date,
            type: entry.type,
            subType: entry.subType,
        })),
    };
}

/**
 * Assainit une période pour un utilisateur : d'abord les substitutions (qui restaurent leurs propres
 * entrées), puis le balayage des entrées de calendrier restantes. Une seule transaction.
 *
 * @param {string|ObjectId} userId
 * @param {{ from: Date|string, to?: Date|string }} period
 * @param {Object} [opts]
 * @param {ClientSession} [opts.session]
 * @param {string} [opts.reason]
 * @returns {Promise<{ cancelled: string[], withdrawn: string[], deactivated: number }>}
 */
export async function sanitizeUserPeriod (userId, period, { session, reason } = {}) {
    normalizePeriod(period); // échoue tôt, avant d'ouvrir une transaction

    return inTransaction(async (activeSession) => {
        const substitutions = await cancelUserSubstitutionsInPeriod(userId, period, { session: activeSession, reason });
        const entries = await clearUserCalendarEntriesInPeriod(userId, period, { session: activeSession });
        return { ...substitutions, ...entries };
    }, { session });
}
