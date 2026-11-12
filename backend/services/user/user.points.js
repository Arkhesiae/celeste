import User from '../../models/User.js';
import PointTransfer from '../../models/PointTransfer.js';
import { AppError } from '../../error/AppError.js';
import { MIN_POINTS_BALANCE } from '../../config/points.js';
import { createScheduledTransaction } from '../transaction/transaction.scheduled.js';

/**
 * Points d'un utilisateur : solde, transfert à un collègue (immédiat ou différé), historique.
 */

export async function getPoints (userId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('User not found.', 404);
    }
    return user.points;
}

/**
 * Transfère des points entre utilisateurs. Avec `scheduledDate`, le transfert est différé (traité plus tard par le
 * job des transferts) ; sinon il est immédiat et le solde de l'expéditeur ne peut pas descendre sous MIN_POINTS_BALANCE.
 * @returns {Promise<{ message: string, transaction: Object }>}
 */
export async function transferPoints ({ fromUserId, toUserId, amount, description, type, scheduledDate }) {
    if (!toUserId || !amount || amount <= 0) {
        throw new AppError('Paramètres invalides', 400);
    }

    if (fromUserId === toUserId) {
        throw new AppError('Vous ne pouvez pas vous transférer des points à vous-même', 400);
    }

    const sender = await User.findById(fromUserId);
    const receiver = await User.findById(toUserId);

    if (!sender || !receiver) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    const amountInt = parseInt(amount);
    if (scheduledDate) {
        const transaction = await createScheduledTransaction({
            sender: fromUserId,
            receiver: toUserId,
            amount: amountInt,
            type: type || 'transfer',
            description,
            scheduledDate: new Date(scheduledDate)
        });

        return { message: 'Transfert programmé avec succès', transaction };
    }

    if (sender.points - amount < MIN_POINTS_BALANCE) {
        throw new AppError('Solde insuffisant', 400);
    }

    const transaction = new PointTransfer({
        sender: fromUserId,
        receiver: toUserId,
        amount: amountInt,
        type: type || 'transfer',
        description,
        status: 'completed',
        effectiveDate: new Date()
    });

    sender.points -= amountInt;
    receiver.points += amountInt;

    await Promise.all([
        transaction.save(),
        sender.save(),
        receiver.save()
    ]);

    return { message: 'Transfert effectué avec succès', transaction };
}

/** Derniers transferts d'un utilisateur (envoyés ou reçus), les plus récents d'abord */
export function getTransferHistory (userId, limit = 10) {
    return PointTransfer.find({
        $or: [
            { sender: userId },
            { receiver: userId }
        ]
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sender', 'name lastName _id')
        .populate('receiver', 'name lastName _id');
}
