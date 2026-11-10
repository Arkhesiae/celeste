import Rotation from '../../models/Rotation.js';
import { inTransaction } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import Substitution from '../../models/Substitution.js';
import Center from '../../models/Center.js';
import { Temporal } from '@js-temporal/polyfill';
import { toDateKey } from '../../utils/dates/dateKey.js';
import { AppError } from '../../error/AppError.js';
import { withdrawFromRequestWithSession, cancelRequestWithSession } from '../substitution/request.internal.js';
import { notifyDemandChanges } from '../email/demand/demandChangeNotifications.js';



const updateActivationDate = async (action, rotationId, activationDate, confirmed = false) => {
    if (!['add', 'remove'].includes(action)) {
        throw new AppError(`Action invalide : ${action}. Utiliser 'add' ou 'remove'.`, 400);
    }

    const rotationToUpdate = await Rotation.findOne({ _id: rotationId, deleted: false });
    if (!rotationToUpdate) throw new AppError('Rotation not found.', 404);

    const centerId = rotationToUpdate.centerId;
    const targetDate = new Date(activationDate);

    // Une seule rotation peut être activée à une date donnée dans un centre : sinon la rotation active ce jour-là est ambiguë
    if (action === 'add') {
        const dateKey = toDateKey(activationDate);
        if (!dateKey || Number.isNaN(targetDate.getTime())) throw new AppError("Date d'activation invalide.", 400);

        // Seuls le jour courant et les jours futurs sont acceptés, selon le fuseau horaire du centre
        const center = await Center.findById(centerId).select('timeZone').lean();
        const today = Temporal.Now.plainDateISO(center?.timeZone || 'Europe/Paris').toString();
        if (dateKey < today) {
            throw new AppError("La date d'activation ne peut pas être dans le passé.", 400, 'ROTATION_ACTIVATION_DATE_PAST');
        }

        const sameDate = await Rotation.exists({ centerId, deleted: false, activationDates: targetDate });
        if (sameDate) {
            throw new AppError('Une rotation est déjà activée à cette date dans ce centre.', 400, 'ROTATION_ACTIVATION_DATE_TAKEN');
        }
    }

    // --- PREVIEW PATH ---
    if (!confirmed) {
        const existingActivations = await getOrderedActivationDates(centerId);
        const simulatedList = simulateActivationChange(existingActivations, action, rotationId, targetDate);
        const { cleanedList } = removeSuccessiveRepetitions(simulatedList);
        const changes = findChangedPeriods(existingActivations, cleanedList);

        if (changes.length === 0) {
            return { needsApproval: false, changes: [], message: 'Cette action n\'entraîne aucun changement' };
        }

        await Promise.all(changes.map(async (change) => {
            const demands = await getDemandsToConvert(change, centerId);
            change.demandsToConvert = demands.map(d => d._id);
            change.demandsCount = demands.length;
            change.simulation = await simulateChangeOutcome(change, demands);
        }));

        const totalDemands = changes.reduce((sum, c) => sum + c.demandsCount, 0);
        const totalCancelled = changes.reduce((sum, c) => sum + c.simulation.toCancel.length, 0);

        let message = `Cette ${action === 'add' ? 'activation' : 'suppression'} affectera ${totalDemands} demande(s)`;
        if (totalCancelled > 0) message += `, dont ${totalCancelled} seront annulée(s) automatiquement`;

        return { needsApproval: true, changes, message };
    }
    // --- CONFIRM PATH ---
    try {
        let outcome;
        let notifications;
        await inTransaction(async (session) => {
            // Recréé à chaque tentative de la transaction : une tentative rejouée ne double pas les notifications
            notifications = { cancelled: [], withdrawn: [] };
            const beforeList = await getOrderedActivationDates(centerId, session);

            const mongoOp = action === 'add'
                ? { $push: { activationDates: targetDate } }
                : { $pull: { activationDates: targetDate } };

            const updatedRotation = await Rotation.findByIdAndUpdate(
                rotationId, mongoOp, { new: true, session }
            );

            if (action === 'remove' && !updatedRotation) {
                throw new AppError(`Aucune activation trouvée à la date ${activationDate}`, 404);
            }

            const afterList = await getOrderedActivationDates(centerId, session);
            const { cleanedList, repetitionToRemove } = removeSuccessiveRepetitions(afterList);
            const changes = findChangedPeriods(beforeList, cleanedList);

            const repetitionsRemoved = await removeRepetitionsInDb(repetitionToRemove, session);

            let message = changes.length === 0
                ? 'Cette action n\'entraîne aucun changement'
                : (action === 'add' ? 'Date d\'activation ajoutée' : 'Date d\'activation supprimée');

            if (repetitionsRemoved > 0) {
                message += ` (${repetitionsRemoved} répétitions successives supprimées)`;
            }
            if (changes.length > 0) {
                message = await handleChanges(changes, centerId, message, session, notifications);
            }

            outcome = { rotation: updatedRotation, message, changes };
        });

        // Après le commit uniquement : prévenir les agents dont la demande a été annulée ou l'accepteur retiré
        notifyDemandChanges({
            cancelledIds: notifications.cancelled,
            withdrawn: notifications.withdrawn,
        });
        return outcome;
    }
    catch (err) {
        console.error('Erreur lors de la mise à jour de la date d\'activation:', err);
        throw err;
    }
};

const evaluatePosterShift = (demand, oldRotation, newRotation) => {
    if (!demand.posterShift?.shift) return { verdict: null };
    const index = oldRotation.days.findIndex(d => sameId(d._id, demand.posterShift.shift._id));
    if (index === -1) return { verdict: 'cancel', reason: 'poster_shift_no_match' };
    const newShift = newRotation.days[index];
    return newShift.type === 'rest'
        ? { verdict: 'cancel', reason: 'poster_shift_became_rest' }
        : { verdict: 'modify', data: { newShiftId: newShift._id } };
};

const evaluateAccepterShift = (demand, oldRotation, newRotation) => {
    if (!['switch', 'hybrid'].includes(demand.type) || !demand.accepterShift?.shift) return { verdict: null };
    const index = oldRotation.days.findIndex(d => sameId(d._id, demand.accepterShift.shift._id));
    if (index === -1) return { verdict: 'cancel', reason: 'accepter_shift_no_match' };
    const newShift = newRotation.days[index];
    return newShift.type === 'rest'
        ? { verdict: 'reopen' }
        : { verdict: 'modify', data: { newShiftId: newShift._id } };
};

const evaluateAcceptedSwitches = (demand, oldRotation, newRotation) => {
    if (!demand.acceptedSwitches?.length) return { verdict: null };

    const validSwitches = demand.acceptedSwitches.reduce((acc, switchItem) => {
        const index = oldRotation.days.findIndex(d => sameId(d._id, switchItem.shift._id));
        if (index !== -1 && newRotation.days[index].type !== 'rest') {
            acc.push({ shift: newRotation.days[index]._id, points: switchItem.points });
        }
        return acc;
    }, []);

    if (validSwitches.length === demand.acceptedSwitches.length) return { verdict: null }; // rien de changé
    if (validSwitches.length > 0) return { verdict: 'modify', data: { validSwitches } };

    return demand.type === 'switch'
        ? { verdict: 'cancel', reason: 'no_valid_switch_remaining' }
        : { verdict: 'modify', data: { validSwitches: [], downgradeToSubstitution: true } }; // hybrid → substitution
};

const evaluateDemand = (demand, oldRotation, newRotation) => ({
    poster: evaluatePosterShift(demand, oldRotation, newRotation),
    accepter: evaluateAccepterShift(demand, oldRotation, newRotation),
    switches: evaluateAcceptedSwitches(demand, oldRotation, newRotation),
});

/** Simule le sort des demandes pour un seul changement de période */
const simulateChangeOutcome = async (change, demands) => {
    if (!change.oldRule || !change.newRule) {
        return buildCancelAllSimulation(demands, 'no_target_rotation');
    }

    const [oldRotation, newRotation] = await Promise.all([
        Rotation.findById(change.oldRule).populate('days'),
        Rotation.findById(change.newRule).populate('days'),
    ]);

    const oldDaysCount = oldRotation?.days?.length || 0;
    const newDaysCount = newRotation?.days?.length || 0;

    if (!newRotation || oldDaysCount !== newDaysCount) {
        return buildCancelAllSimulation(demands, 'rotation_structure_mismatch');
    }

    const populatedDemands = await Substitution.populate(demands, [
        { path: 'acceptedSwitches.shift' },
        { path: 'posterShift.shift' },
        { path: 'accepterShift.shift' },
    ]);

    return simulateDemandConversion(populatedDemands, oldRotation, newRotation);
};

/** Simulation "tout annulé" — même règle que handleChanges quand aucune conversion n'est possible */
const buildCancelAllSimulation = (demands, reason) => ({
    toCancel: demands.map(d => ({ demandId: d._id, reason })),
    toReopen: [],
    toConvert: [],
    unaffected: [],
});


/**
 * Simule (sans écrire en base) le sort de chaque demande si la conversion était appliquée.
 * Reproduit la logique de convertCenterDemands en lecture seule.
 */
const simulateDemandConversion = (populatedDemands, oldRotation, newRotation) => {
    const result = { toCancel: [], toReopen: [], toConvert: [], unaffected: [] };

    for (const demand of populatedDemands) {
        const { poster, accepter, switches } = evaluateDemand(demand, oldRotation, newRotation);
        const cancelled = [poster, accepter, switches].find(o => o.verdict === 'cancel');

        const bucket = cancelled ? 'toCancel'
            : accepter.verdict === 'reopen' ? 'toReopen'
                : [poster, accepter, switches].some(o => o.verdict === 'modify') ? 'toConvert'
                    : 'unaffected';

        result[bucket].push(cancelled ? { demandId: demand._id, reason: cancelled.reason } : { demandId: demand._id });
    }

    return result;
};

const handleChanges = async (changes, centerId, message, session = null, notifications = { cancelled: [], withdrawn: [] }) => {
    try {
        // Séquentiel : une transaction MongoDB n'accepte pas d'opérations en parallèle sur la même session
        for (const change of changes) {
            if (!change.oldRule && !change.newRule) {
                throw new AppError('Aucune rotation trouvée pour le changement.', 404);
            }
            const oldRotation = await Rotation.findById(change.oldRule).session(session).populate('days');
            const newRotation = await Rotation.findById(change.newRule).session(session).populate('days');
            const demandsToConvert = await getDemandsToConvert(change, centerId, session);

            const oldRotationDaysCount = oldRotation?.days?.length || 0;
            const newRotationDaysCount = newRotation?.days?.length || 0;

            if (oldRotationDaysCount !== newRotationDaysCount || !newRotation) {
                const cancelledCount = await systemCancelDemands(demandsToConvert, session, notifications);
                message += ' - ' + cancelledCount + ' demandes annulées';
            } else {
                const result = await convertCenterDemands(demandsToConvert, oldRotation, newRotation, session, notifications);
                if (result.converted > 0) {
                    message += ' - ' + result.converted + ' demandes converties';
                }
                if (result.cancelled > 0) {
                    message += ' - ' + result.cancelled + ' demandes annulées';
                }
            }
        }
        return message;
    } catch (err) {
        console.error('Erreur lors de la gestion du changement:', err);
        throw err;
    }
};




/**
 * Convertit les demandes de substitution pour une nouvelle rotation
 * @param {Array} demandsToConvert - Les demandes à convertir
 * @param {string} oldRotationId - ID de l'ancienne rotation
 * @param {string} newRotationId - ID de la nouvelle rotation
 * @returns {Promise<{ converted: number, cancelled: number }>}
 */
const convertCenterDemands = async (demandsToConvert, oldRotation, newRotation, session = null, notifications = { cancelled: [], withdrawn: [] }) => {
    try {
        if (!oldRotation || !newRotation) {
            throw new AppError('Rotation introuvable.', 404);
        }

        let cancelledDemands = 0;
        let convertedDemands = 0;

        // Fetch batché au lieu d'un findById par demande
        const populatedDemands = await Substitution.find({ _id: { $in: demandsToConvert.map(d => d._id) } })
            .session(session)
            .populate('acceptedSwitches.shift')
            .populate('posterShift.shift')
            .populate('accepterShift.shift');

        const byId = new Map(populatedDemands.map(d => [d._id.toString(), d]));

        for (const demand of demandsToConvert) {
            const populatedDemand = byId.get(demand._id.toString());
            if (!populatedDemand) continue;

            const { poster, accepter, switches } = evaluateDemand(populatedDemand, oldRotation, newRotation);
            const cancelled = [poster, accepter, switches].find(o => o.verdict === 'cancel');

            if (cancelled) {
                // Les erreurs remontent : la transaction est annulée et l'appelant est prévenu
                const cancelledRequests = [];
                await cancelRequestWithSession(populatedDemand._id, { session, reason: "system-cancelled", cancelledRequests });
                notifications.cancelled.push(...cancelledRequests.map((r) => r._id));
                console.log(`✅ [${populatedDemand._id}] Demande annulée (${cancelled.reason})`);
                cancelledDemands++;
                continue;
            }

            let demandModified = false;
            let demandReopened = false;
            let currentDemand = populatedDemand;

            if (accepter.verdict === 'reopen') {
                await withdrawFromRequestWithSession(populatedDemand._id, populatedDemand.accepterId, { session });
                notifications.withdrawn.push({ demandId: populatedDemand._id, accepterId: populatedDemand.accepterId });
                console.log(`✅ [${populatedDemand._id}] Demande réouverte (accepter shift est maintenant un repos)`);
                demandReopened = true;
                // Le retrait a sauvegardé la demande : on la relit pour ne pas écraser son état avec une copie périmée
                currentDemand = await Substitution.findById(populatedDemand._id)
                    .session(session)
                    .populate('acceptedSwitches.shift')
                    .populate('posterShift.shift')
                    .populate('accepterShift.shift');
            } else if (accepter.verdict === 'modify') {
                currentDemand.accepterShift.shift = accepter.data.newShiftId;
                demandModified = true;
            }

            if (poster.verdict === 'modify') {
                currentDemand.posterShift.shift = poster.data.newShiftId;
                demandModified = true;
            }

            if (switches.verdict === 'modify') {
                currentDemand.acceptedSwitches = switches.data.validSwitches;
                if (switches.data.downgradeToSubstitution) {
                    currentDemand.type = 'substitution';
                    console.log(`✅ [${currentDemand._id}] Demande convertie en substitution (hybride sans option valide)`);
                }
                demandModified = true;
            }

            if (demandModified || demandReopened) {
                if (demandModified) await currentDemand.save({ session });
                convertedDemands++;
                console.log(`✅ [${populatedDemand._id}] Demande convertie avec succès`);
            }
        }

        return { converted: convertedDemands, cancelled: cancelledDemands };
    } catch (err) {
        console.error('Erreur lors de la conversion des demandes:', err);
        throw err;
    }
};

  


/**
 * Nettoie les répétitions et applique les suppressions en base
 * @param {Array<Object>} repetitionToRemove
 * @param {Object} session - Session de transaction MongoDB
 * @returns {number} Nombre de répétitions supprimées
 */
const removeRepetitionsInDb = async (repetitionToRemove, session = null) => {
    let removedCount = 0;
    for (const repetition of repetitionToRemove) {
        await Rotation.findByIdAndUpdate(
            repetition.rotationId,
            { $pull: { activationDates: repetition.activationDate } },
            { new: true, session }
        );
        removedCount++;
    }
    return removedCount;
};

const simulateActivationChange = (existingActivations, action, rotationId, targetDate) => {
    const list = [...existingActivations];
    if (action === 'add') {
        const insertIndex = list.findIndex(a => new Date(a.activationDate) > targetDate);
        list.splice(insertIndex === -1 ? list.length : insertIndex, 0, { rotationId, activationDate: targetDate });
    } else {
        const removeIndex = list.findIndex(a => new Date(a.activationDate).getTime() === targetDate.getTime());
        if (removeIndex !== -1) list.splice(removeIndex, 1);
    }
    return list;
};


const getDemandsToConvert = async (change, centerId, session = null) => {
    const dateFilter = {};
    if (change.from) dateFilter.$gte = new Date(change.from);
    if (change.to) dateFilter.$lt = new Date(change.to);

    return Substitution.find({
        centerId,
        status: { $in: ['open', 'accepted'] },
        deleted: false,
        'posterShift.date': dateFilter
    }).session(session);
};

/**
 * Annule les demandes avec le même nettoyage qu'une annulation normale : cascade sur les demandes dépendantes,
 * transactions de points en attente annulées, entrées de calendrier de substitution désactivées.
 * @returns {Promise<number>} nombre de demandes annulées (cascade comprise)
 */
const systemCancelDemands = async (demands, session, notifications = { cancelled: [], withdrawn: [] }) => {
    const visited = new Set();
    const cancelledRequests = [];

    for (const demand of demands) {
        await cancelRequestWithSession(demand._id, { session, visited, cancelledRequests, reason: 'system-cancelled' });
    }

    notifications.cancelled.push(...cancelledRequests.map((r) => r._id));
    return cancelledRequests.length;
};



/**
 * Obtient une liste ordonnée des dates d'activation successives avec les rotations correspondantes
 * @param {string} centerId - ID du centre (optionnel, si non fourni, retourne toutes les rotations)
 * @returns {Array} Liste ordonnée des activations avec rotation et date
 */
const getOrderedActivationDates = async (centerId, session = null) => {
    const activations = await Rotation.aggregate([
        { $match: { centerId, deleted: false } },
        { $unwind: '$activationDates' },
        { $project: { rotationId: '$_id', activationDate: '$activationDates' } },
        { $sort: { activationDate: 1 } }
    ]).session(session);
    return activations;
};




const removeSuccessiveRepetitions = (orderedList) => {
    if (orderedList.length < 2) return { cleanedList: [...orderedList], repetitionToRemove: [] };

    const repetitionToRemove = [];
    const cleanedList = orderedList.reduce((acc, curr, i) => {
        const prev = acc[acc.length - 1];
        if (prev && sameId(prev.rotationId, curr.rotationId)) {
            repetitionToRemove.push(curr);
            return acc;
        }
        return [...acc, curr];
    }, []);

    return { cleanedList, repetitionToRemove };
};


function findChangedPeriods (before, after) {
    // Convert to sorted timelines
    const allDates = Array.from(
        new Set([...before, ...after].map(a => a.activationDate))
    ).sort((a, b) => new Date(a) - new Date(b));

    const parseDate = d => new Date(d);

    // Helper: find active rule at a given time
    const getActiveRule = (list, date) => {
        const beforeDates = list
            .filter(a => parseDate(a.activationDate) <= date)
            .sort((a, b) => b.activationDate - a.activationDate);
        return beforeDates[0]?.rotationId || null;
    };

    const changes = [];
    for (let i = 0; i < allDates.length; i++) {
        const from = parseDate(allDates[i]);
        const to = allDates[i + 1] ? parseDate(allDates[i + 1]) : null;

        const oldRule = getActiveRule(before, from);
        const newRule = getActiveRule(after, from);

        if (oldRule?.toString() !== newRule?.toString()) {
            changes.push({ from, to, oldRule, newRule });
        }
    }

    console.log('changes', changes);
    return changes;
}




export default {
    findChangedPeriods,
    removeRepetitionsInDb,
    updateActivationDate,
    convertCenterDemands,
};
