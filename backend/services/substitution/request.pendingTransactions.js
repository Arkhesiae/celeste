import PointTransfer from '../../models/PointTransfer.js';
import { cancelScheduledTransaction } from '../transaction/transaction.scheduled.js';

export const cancelRequestTransactions = async (requestId, { session } = {}) => {
    const transactions = await PointTransfer.find({ request: requestId, status: 'pending' }).session(session);
    if (transactions.length > 0) {
        // Une par une : opérations concurrentes sur une session de transaction non supportées (known issue #48)
        for (const transaction of transactions) {
            try {
                await cancelScheduledTransaction(transaction._id, { session });
            } catch (error) {
                console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
            }
        }
    }
}
