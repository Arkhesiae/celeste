import User from '../../models/User.js';
import Center from '../../models/Center.js';
import { sameId } from '../../utils/ids.js';

/**
 * Demandes de mutation en cours, vues par un administrateur : celles qui arrivent dans son centre (qu'il peut accepter) et celles
 * qui en partent (en lecture seule). L'administrateur principal voit toutes les demandes et peut toutes les accepter.
 * Une demande est un utilisateur dont `pendingCenterTransfer` est renseigné : son centre actuel est le centre de départ.
 *
 * @param {{ adminType: string, centerId?: string }} caller
 */
export async function listCenterTransfers (caller) {
    const isMaster = caller.adminType === 'master';
    const filter = isMaster
        ? { pendingCenterTransfer: { $ne: null } }
        : {
            $or: [
                { 'pendingCenterTransfer.toCenterId': caller.centerId },
                { centerId: caller.centerId, pendingCenterTransfer: { $ne: null } },
            ],
        };

    const users = await User.find(filter).select('name lastName avatar points centerId pendingCenterTransfer').lean();

    const centerIds = users.flatMap((user) => [user.centerId, user.pendingCenterTransfer.toCenterId]);
    const centers = await Center.find({ _id: { $in: centerIds } }).select('name OACI').lean();
    const brief = (id) => {
        const center = centers.find((c) => sameId(c._id, id));
        return center ? { _id: center._id, name: center.name, OACI: center.OACI } : null;
    };

    return users
        .map((user) => {
            const { toCenterId, reason, requestedAt } = user.pendingCenterTransfer;
            return {
                userId: user._id,
                name: user.name,
                lastName: user.lastName,
                avatar: user.avatar ?? null,
                points: user.points,
                fromCenter: brief(user.centerId),
                toCenter: brief(toCenterId),
                reason,
                requestedAt,
                // `incoming` : le centre de l'administrateur reçoit l'agent ; `outgoing` : il le perd (lecture seule)
                direction: sameId(toCenterId, caller.centerId) ? 'incoming' : 'outgoing',
                canAccept: isMaster || sameId(toCenterId, caller.centerId),
            };
        })
        .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
}
