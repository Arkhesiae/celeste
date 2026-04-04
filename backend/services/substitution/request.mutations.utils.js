import Transaction from '../../models/Transaction.js';
import * as scheduledTransactionService from '../transaction/scheduledTransactionService.js';

export const cancelPendingTransactions = async (requestId, { session } = {}) => {
    const transactions = await Transaction.find({ request: requestId, status: 'pending' }).session(session);
    if (transactions.length > 0) {
        await Promise.all(transactions.map(async (transaction) => {
            try {
                await scheduledTransactionService.cancelDelayedTransaction(transaction._id, { session });
            } catch (error) {
                console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
            }
        }));
    }
}
