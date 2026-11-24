import PointTransfer from '../../models/PointTransfer.js';
import { findOrThrow } from '../../utils/mongo.js';
import Demand from '../../models/Demand.js';
import { AppError } from '../../error/AppError.js';

import { MIN_POINTS_BALANCE } from '../../config/points.js';
import { notifyPointTransferCompleted, notifyPointTransferCancelled } from '../email/email.pointTransfer.js';
/**
 * Crée une transaction différée
 * @param {Object} transactionData - Données de la transaction
 * @returns {Promise<Object>} La transaction créée
 */
const createScheduledTransaction = async (transactionData) => {
    const transaction = new PointTransfer({
        ...transactionData,
        status: 'pending',
        effectiveDate: new Date(transactionData.scheduledDate)
    });
    await transaction.save();
    return transaction;
};

/**
 * Exécute les transactions dont la date d'effectivité est atteinte
 * @returns {Promise<void>}
 */
const processPendingTransactions = async () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pendingTransactions = await PointTransfer.find({
        status: 'pending',
        effectiveDate: { $lt: startOfToday }
    }).populate('sender').populate('receiver');

    // Une transaction liée à une demande ne s'exécute que si la demande est toujours acceptée ou terminée
    const demandIds = [...new Set(pendingTransactions.filter(t => t.request).map(t => t.request.toString()))];
    const liveDemands = new Set(
        (await Demand.find({ _id: { $in: demandIds }, status: { $in: ['accepted', 'completed'] } }).select('_id'))
            .map(r => r._id.toString())
    );

    // Ce qu'il est advenu de chaque transfert : les mails partent après la boucle, une fois les soldes enregistrés
    const outcomes = [];

    for (const transaction of pendingTransactions) {
        try {
            if (transaction.request && !liveDemands.has(transaction.request.toString())) {
                transaction.status = 'cancelled';
                await transaction.save();
                outcomes.push({ id: transaction._id, reason: 'demandNoLongerAccepted' });
                continue;
            }
    
            if ((transaction.sender.points - transaction.amount) < MIN_POINTS_BALANCE) {
                transaction.status = 'cancelled';
                await transaction.save();
                outcomes.push({ id: transaction._id, reason: 'insufficientBalance' });
                continue;
            }
            // Effectuer le transfert
            transaction.sender.points -= transaction.amount;
            transaction.receiver.points += transaction.amount;
            transaction.status = 'completed';

            await Promise.all([
                transaction.sender.save(),
                transaction.receiver.save(),
                transaction.save()
            ]);
            outcomes.push({ id: transaction._id, reason: null });
        } catch (error) {
            console.error(`Erreur lors du traitement de la transaction ${transaction._id}:`, error);
            transaction.status = 'cancelled';
            await transaction.save();
            outcomes.push({ id: transaction._id, reason: 'error' });
        }
    }

    // Une raison : transfert annulé ; sans raison : transfert exécuté. Ces fonctions ne lèvent jamais.
    for (const { id, reason } of outcomes) {
        await (reason ? notifyPointTransferCancelled(id, reason) : notifyPointTransferCompleted(id));
    }
    return pendingTransactions.length;
};

/**
 * Annule une transaction différée
 * @param {string} transactionId - ID de la transaction
 * @returns {Promise<Object>} La transaction annulée
 */
const cancelScheduledTransaction = async (transactionId, { session }) => {
    const transaction = await findOrThrow(PointTransfer, transactionId, { message: 'Transaction non trouvée', session });
    if (transaction.status !== 'pending') {
        throw new AppError('Seules les transactions en attente peuvent être annulées', 400);
    }

    transaction.status = 'cancelled';
    await transaction.save({ session });
    return transaction;
};

export { createScheduledTransaction, processPendingTransactions, cancelScheduledTransaction }; 