import Transaction from '../../models/Transaction.js';
import { findOrThrow } from '../../utils/mongo.js';
import Substitution from '../../models/Substitution.js';
import { AppError } from '../../error/AppError.js';

import { MIN_POINTS_BALANCE } from '../../config/points.js';
/**
 * Crée une transaction différée
 * @param {Object} transactionData - Données de la transaction
 * @returns {Promise<Object>} La transaction créée
 */
const createScheduledTransation = async (transactionData) => {
    const transaction = new Transaction({
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
    const pendingTransactions = await Transaction.find({
        status: 'pending',
        effectiveDate: { $lt: startOfToday }
    }).populate('sender').populate('receiver');

    // Une transaction liée à une demande ne s'exécute que si la demande est toujours acceptée ou terminée
    const requestIds = [...new Set(pendingTransactions.filter(t => t.request).map(t => t.request.toString()))];
    const liveRequests = new Set(
        (await Substitution.find({ _id: { $in: requestIds }, status: { $in: ['accepted', 'completed'] } }).select('_id'))
            .map(r => r._id.toString())
    );

    for (const transaction of pendingTransactions) {
        try {
            if (transaction.request && !liveRequests.has(transaction.request.toString())) {
                transaction.status = 'cancelled';
                await transaction.save();
                continue;
            }
            // Vérifier que l'expéditeur a toujours assez de points
            // if (transaction.type === "replacement" || transaction.type === "swap") {
            //     // Pour replacement/swap, le solde minimum autorisé est -20
            //     if ((transaction.sender.points - transaction.amount) < -40) {
            //         transaction.status = 'cancelled';
            //         await transaction.save();
            //         continue;
            //     }
            // } else if (transaction.type === "transfer") {
            //     // Pour un transfert classique, le solde ne peut pas devenir négatif
            //     if ((transaction.sender.points - transaction.amount) < -40) {
            //         transaction.status = 'cancelled';
            //         await transaction.save();
            //         continue;
            //     }
            // }
            if ((transaction.sender.points - transaction.amount) < MIN_POINTS_BALANCE) {
                transaction.status = 'cancelled';
                await transaction.save();
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
        } catch (error) {
            console.error(`Erreur lors du traitement de la transaction ${transaction._id}:`, error);
            transaction.status = 'cancelled';
            await transaction.save();
        }
    }
    return pendingTransactions.length;
};

/**
 * Annule une transaction différée
 * @param {string} transactionId - ID de la transaction
 * @returns {Promise<Object>} La transaction annulée
 */
const cancelScheduledTransation = async (transactionId, { session }) => {
    const transaction = await findOrThrow(Transaction, transactionId, { message: 'Transaction non trouvée', session });
    if (transaction.status !== 'pending') {
        throw new AppError('Seules les transactions en attente peuvent être annulées', 400);
    }

    transaction.status = 'cancelled';
    await transaction.save({ session });
    return transaction;
};

export { createScheduledTransation, processPendingTransactions, cancelScheduledTransation }; 