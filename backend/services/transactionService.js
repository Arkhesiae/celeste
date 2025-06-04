const Transaction = require('../models/Transaction');

/**
 * Crée une transaction différée
 * @param {Object} transactionData - Données de la transaction
 * @returns {Promise<Object>} La transaction créée
 */
const createDelayedTransaction = async (transactionData) => {
    console.log(transactionData)
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
    const pendingTransactions = await Transaction.find({
        status: 'pending',
        effectiveDate: { $lte: now }
    }).populate('sender').populate('receiver');

    for (const transaction of pendingTransactions) {
        try {
            // Vérifier que l'expéditeur a toujours assez de points
            if (transaction.type === "replacement" || transaction.type === "swap") {
                // Pour replacement/swap, le solde minimum autorisé est -20
                if ((transaction.sender.points - transaction.amount) < -20) {
                    transaction.status = 'cancelled';
                    await transaction.save();
                    continue;
                }
            } else if (transaction.type === "transfer") {
                // Pour un transfert classique, le solde ne peut pas devenir négatif
                if ((transaction.sender.points - transaction.amount) < 0) {
                    transaction.status = 'cancelled';
                    await transaction.save();
                    continue;
                }
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
};

/**
 * Annule une transaction différée
 * @param {string} transactionId - ID de la transaction
 * @returns {Promise<Object>} La transaction annulée
 */
const cancelDelayedTransaction = async (transactionId) => {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
        throw new Error('Transaction non trouvée');
    }

    if (transaction.status !== 'pending') {
        throw new Error('Seules les transactions en attente peuvent être annulées');
    }

    transaction.status = 'cancelled';
    await transaction.save();
    return transaction;
};

module.exports = {
    createDelayedTransaction,
    processPendingTransactions,
    cancelDelayedTransaction
}; 