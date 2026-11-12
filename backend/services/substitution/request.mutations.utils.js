import Transaction from '../../models/Transaction.js';
import { cancelScheduledTransation } from '../transaction/transaction.scheduled.js';

export const cancelPendingTransactions = async (requestId, { session } = {}) => {
    const transactions = await Transaction.find({ request: requestId, status: 'pending' }).session(session);
    if (transactions.length > 0) {
        // Une par une : opérations concurrentes sur une session de transaction non supportées (known issue #48)
        for (const transaction of transactions) {
            try {
                await cancelScheduledTransation(transaction._id, { session });
            } catch (error) {
                console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
            }
        }
    }
}
