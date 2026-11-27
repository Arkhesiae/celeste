import { inTransaction } from '../../utils/mongo.js';
import { dayFilter, posterDayOf, accepterDayOf } from '../../utils/dates/dayAccess.js';
import { fullName } from '../../utils/names.js';
import { sameId } from '../../utils/ids.js';
import Demand from '../../models/Demand.js';
import { CalendarEntry } from '../../models/CalendarEntry.js';
import PointTransfer from '../../models/PointTransfer.js';
import { AppError } from '../../error/AppError.js';
import { toDateKey } from '../../utils/dates/dateKey.js';
import {
    CANCELLABLE_STATUSES,
    cancelDemandWithSession,
    withdrawFromDemandWithSession,
} from '../demand/demand.cascade.js';

/**
 * Helpers pour "assainir" une période d'un utilisateur (ex. après un changement d'équipe) :
 *  - cancelUserDemandsInPeriod : annule / se désiste de ses demandes
 *  - clearUserCalendarEntriesInPeriod : désactive ses entrées de calendrier liées aux vacations
 *  - sanitizeUserPeriod : les deux, dans une même transaction
 *  - sanitizeUserPeriods : plusieurs périodes (d'un ou plusieurs utilisateurs), résultats réunis
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
 *   clés YYYY-MM-DD (entrées de calendrier) et bornes Date UTC (demandes)
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
const periodDemandsQuery = (userId, { fromKey, toKey: endKey }) => {
    const bounds = endKey ? { gte: fromKey, lte: endKey } : { gte: fromKey };
    return {
        deleted: { $ne: true },
        status: { $in: ['open', 'accepted'] },
        $or: [{ posterId: userId }, { accepterId: userId }],
        $and: [{ $or: [
            dayFilter('posterShift.day', 'posterShift.date', bounds),
            dayFilter('accepterShift.day', 'accepterShift.date', bounds),
        ] }],
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
export async function cancelUserDemandsInPeriod (userId, period, { session, reason = 'system-cancelled' } = {}) {
    const normalized = normalizePeriod(period);
    const uid = userId.toString();

    return inTransaction(async (activeSession) => {
        const candidates = await Demand.find(periodDemandsQuery(userId, normalized))
            .select('_id').session(activeSession);

        const cancelledDemands = [];
        const withdrawn = [];

        for (const { _id } of candidates) {
            // Relecture : une annulation en cascade précédente a pu changer l'état de cette demande
            const demand = await Demand.findById(_id)
                .select('status posterId accepterId')
                .session(activeSession);
            if (!demand || !['open', 'accepted'].includes(demand.status)) continue;

            if (sameId(demand.posterId, uid)) {
                await cancelDemandWithSession(_id, { session: activeSession, cancelledDemands, reason });
            } else if (demand.accepterId?.toString() === uid && demand.status === 'accepted') {
                await withdrawFromDemandWithSession(_id, userId, { session: activeSession, cancelledDemands });
                withdrawn.push(_id.toString());
            }
        }

        return {
            cancelled: [...new Set(cancelledDemands.map((r) => r._id.toString()))],
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

/** Vrai quand un aperçu (`previewUserPeriodImpact`) annonce quelque chose : sans quoi aucune confirmation n'est demandée */
export const hasPeriodImpact = ({ demands, entries }) => demands.length > 0 || entries.length > 0;

/**
 * Les transferts de points en attente qui répondent au filtre, décrits pour un aperçu
 * @returns {Promise<Array<{ id: string, demandId: string|null, amount: number, sender: string|null, receiver: string|null, date: string|null }>>}
 */
export async function describePendingTransfers (filter) {
    const transfers = await PointTransfer.find({ ...filter, status: 'pending' })
        .sort({ effectiveDate: 1 })
        .populate([{ path: 'sender', select: 'name lastName' }, { path: 'receiver', select: 'name lastName' }]);

    return transfers.map((transfer) => ({
        id: transfer._id.toString(),
        demandId: transfer.request?.toString() ?? null,
        amount: transfer.amount,
        sender: fullName(transfer.sender) || null,
        receiver: fullName(transfer.receiver) || null,
        date: toDateKey(transfer.effectiveDate),
    }));
}

/**
 * Aperçu en lecture seule de ce que ferait `sanitizeUserPeriod` (rien n'est modifié) : demandes qui seraient
 * annulées ou dont l'utilisateur se désisterait (y compris les demandes dépendantes annulées en cascade),
 * et entrées de calendrier qui seraient désactivées. Chaque demande porte les transferts de points différés annulés avec elle
 * (`transfers`).
 *
 * @param {string|ObjectId} userId
 * @param {{ from: Date|string, to?: Date|string }} period
 * @returns {Promise<{
 *   demands: Array<{ id: string, action: 'cancel'|'withdraw', cascade: boolean, type: string, status: string,
 *                          date: string|null, accepterDate: string|null, poster: string, accepter: string|null,
 *                          transfers: Array }>,
 *   entries: Array<{ id: string, date: string, type: string, subType: string }>
 * }>}
 */
export async function previewUserPeriodImpact (userId, period) {
    const normalized = normalizePeriod(period);
    const uid = userId.toString();
    const populate = [{ path: 'posterId', select: 'name lastName' }, { path: 'accepterId', select: 'name lastName' }];

    const direct = await Demand.find(periodDemandsQuery(userId, normalized)).populate(populate);

    const byId = new Map();
    const describe = (demand, action, cascade) => {
        byId.set(demand._id.toString(), {
            id: demand._id.toString(),
            action,
            cascade,
            type: demand.type,
            status: demand.status,
            date: posterDayOf(demand),
            accepterDate: accepterDayOf(demand),
            poster: fullName(demand.posterId) || null,
            accepter: fullName(demand.accepterId) || null,
            transfers: [],
        });
    };

    // Même règle que cancelUserDemandsInPeriod : auteur → annulation ; accepteur d'une demande acceptée → désistement
    const queue = [];
    for (const demand of direct) {
        if (demand.posterId?._id?.toString() === uid) {
            describe(demand, 'cancel', false);
            queue.push(demand._id);
        } else if (demand.accepterId?._id?.toString() === uid && demand.status === 'accepted') {
            describe(demand, 'withdraw', false);
            queue.push(demand._id);
        }
    }

    // Annulations en cascade (demandes dépendantes), à tout niveau
    while (queue.length) {
        const parentId = queue.shift();
        // Comme l'annulation réelle : une demande terminée ou déjà annulée reste telle quelle, ainsi que ce qui en dépend
        const children = await Demand.find({ dependsOn: parentId, status: { $in: CANCELLABLE_STATUSES } }).populate(populate);
        for (const child of children) {
            if (byId.has(child._id.toString())) continue;
            describe(child, 'cancel', true);
            queue.push(child._id);
        }
    }

    // Seule une demande acceptée a des transferts à annuler (voir demand.cascade.js)
    const acceptedIds = [...byId.values()].filter((demand) => demand.status === 'accepted').map((demand) => demand.id);
    for (const transfer of await describePendingTransfers({ request: { $in: acceptedIds } })) {
        byId.get(transfer.demandId).transfers.push(transfer);
    }

    const entries = await CalendarEntry.find(periodEntriesQuery(userId, normalized)).sort({ date: 1 });

    return {
        demands: [...byId.values()],
        entries: entries.map((entry) => ({
            id: entry._id.toString(),
            date: entry.date,
            type: entry.type,
            subType: entry.subType,
        })),
    };
}

/**
 * Assainit une période pour un utilisateur : d'abord les demandes (qui restaurent leurs propres
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
        const demands = await cancelUserDemandsInPeriod(userId, period, { session: activeSession, reason });
        const entries = await clearUserCalendarEntriesInPeriod(userId, period, { session: activeSession });
        return { ...demands, ...entries };
    }, { session });
}

/**
 * Assainit plusieurs périodes, d'un ou plusieurs utilisateurs, dans une même transaction, et réunit les résultats sous la forme
 * qu'attend `notifyDemandChanges`.
 *
 * @param {Array<{ userId: string|ObjectId, from: string, to?: string|null }>} periods
 * @param {Object} [opts]
 * @param {ClientSession} [opts.session]
 * @returns {Promise<{ cancelled: string[], withdrawn: Array<{ demandId: string, accepterId: string|ObjectId }>, deactivated: number }>}
 */
export async function sanitizeUserPeriods (periods, { session } = {}) {
    return inTransaction(async (activeSession) => {
        // Recréé à chaque tentative : une transaction rejouée repart de zéro
        const cancelled = new Set();
        const withdrawn = [];
        let deactivated = 0;

        // Séquentiel : des opérations concurrentes sur une même session de transaction ne sont pas permises
        for (const { userId, from, to } of periods) {
            const result = await sanitizeUserPeriod(userId, { from, to }, { session: activeSession });
            result.cancelled.forEach((id) => cancelled.add(id));
            withdrawn.push(...result.withdrawn.map((demandId) => ({ demandId, accepterId: userId })));
            deactivated += result.deactivated;
        }

        return { cancelled: [...cancelled], withdrawn, deactivated };
    }, { session });
}
