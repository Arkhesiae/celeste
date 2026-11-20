import User from '../../models/User.js';
import PointTransfer from '../../models/PointTransfer.js';
import { AppError } from '../../error/AppError.js';
import { findOrThrow, inTransaction } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import { sanitizeUserPeriod } from '../user/user.sanitizePeriod.js';
import { notifyDemandChanges } from '../email/demand/demand.changeNotifications.js';
import { upcomingPeriod } from './centerTransfer.request.js';

/**
 * Acceptation d'une mutation par l'administrateur du centre d'arrivée (ou l'administrateur principal). Dans une seule transaction :
 *  - la période à venir est assainie (demandes annulées ou désistement, entrées de calendrier liées à une vacation désactivées),
 *  - les transferts de points différés en attente sont annulés,
 *  - l'utilisateur change de centre, ses équipes et ses points sont remis à zéro, et la demande disparaît ;
 *    un administrateur local ne l'est plus dans le nouveau centre.
 * Le jeton de l'utilisateur porte l'ancien centre jusqu'à son prochain renouvellement (15 min par défaut).
 *
 * @param {string} userId - l'utilisateur qui change de centre
 * @param {{ userId: string, adminType: string, centerId?: string }} caller - l'administrateur qui accepte
 */
export async function acceptCenterTransfer (userId, caller) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', select: 'centerId pendingCenterTransfer' });
    const pending = user.pendingCenterTransfer;
    if (!pending) throw new AppError('Aucune demande de mutation en cours pour cet utilisateur', 404);

    if (caller.adminType !== 'master' && !sameId(caller.centerId, pending.toCenterId)) {
        throw new AppError("Seul l'administrateur du centre d'arrivée peut accepter cette mutation", 403);
    }

    const period = await upcomingPeriod(user.centerId);

    const { cancelled, withdrawn } = await inTransaction(async (session) => {
        const current = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', session });
        if (!current.pendingCenterTransfer) throw new AppError('Aucune demande de mutation en cours pour cet utilisateur', 404);

        const result = await sanitizeUserPeriod(current._id, period, { session });

        await PointTransfer.updateMany(
            { type: 'transfer', status: 'pending', $or: [{ sender: current._id }, { receiver: current._id }] },
            { $set: { status: 'cancelled' } },
            { session },
        );

        current.centerId = current.pendingCenterTransfer.toCenterId;
        current.teams = [];
        current.points = 0;
        current.pendingCenterTransfer = null;
        if (current.adminType === 'local') {
            current.isAdmin = false;
            current.adminType = null;
        }
        await current.save({ session });

        return result;
    });

    // Après le commit uniquement : les tiers touchés (contreparties, demandes en cascade) sont prévenus par email
    notifyDemandChanges({
        cancelledIds: cancelled,
        withdrawn: withdrawn.map((demandId) => ({ demandId, accepterId: userId })),
        actorId: caller.userId,
    });

    return { cancelled: cancelled.length, withdrawn: withdrawn.length };
}
