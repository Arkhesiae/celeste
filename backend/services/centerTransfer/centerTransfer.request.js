import User from '../../models/User.js';
import Center from '../../models/Center.js';
import { AppError } from '../../error/AppError.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import { previewUserPeriodImpact } from '../user/user.sanitizePeriod.js';

/**
 * Demande de mutation d'un utilisateur vers un autre centre (`User.pendingCenterTransfer`) : lecture, aperçu de ce que
 * l'acceptation effacera, dépôt et annulation par l'utilisateur. L'acceptation est dans `centerTransfer.accept.js`.
 * Tant que la demande existe, l'utilisateur ne peut agir ni sur les équipes, ni sur les points, ni sur les remplacements
 * (middleware/userStatus.js) ; il peut l'annuler à tout moment.
 */

const REASON_MAX_LENGTH = 500;

/** La période « à venir » d'une mutation : d'aujourd'hui (jour du centre de départ) sans limite de fin */
export const upcomingPeriod = async (centerId) => ({ from: todayIn(await getCenterTimeZone(centerId)).toString() });

/** La demande en cours de l'utilisateur, avec le centre d'arrivée, ou null */
export async function getMyCenterTransfer (userId) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', select: 'pendingCenterTransfer' });
    const pending = user.pendingCenterTransfer;
    if (!pending) return null;

    const center = await Center.findById(pending.toCenterId).select('name OACI').lean();
    return {
        toCenter: center ? { _id: center._id, name: center.name, OACI: center.OACI } : { _id: pending.toCenterId, name: '', OACI: '' },
        reason: pending.reason,
        requestedAt: pending.requestedAt,
    };
}

/**
 * Ce que l'acceptation d'une mutation effacerait pour cet utilisateur (rien n'est modifié) : demandes à venir annulées ou dont il
 * se désiste, entrées de calendrier liées à une vacation désactivées, points remis à zéro (`negativePoints` : solde négatif).
 */
export async function previewCenterTransfer (userId) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', select: 'points centerId' });
    const impact = await previewUserPeriodImpact(user._id, await upcomingPeriod(user.centerId));
    return {
        demands: impact.demands.length,
        entries: impact.entries.length,
        points: user.points,
        negativePoints: user.points < 0,
    };
}

/** Dépose la demande de mutation de l'utilisateur */
export async function requestCenterTransfer (userId, { toCenterId, reason }) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });

    if (!user.centerId) throw new AppError("Vous n'êtes rattaché à aucun centre", 400);
    if (user.pendingCenterTransfer) {
        throw new AppError('Une demande de mutation est déjà en cours', 400, 'CENTER_TRANSFER_ALREADY_PENDING');
    }
    if (sameId(user.centerId, toCenterId)) throw new AppError('Vous êtes déjà rattaché à ce centre', 400);
    if (reason.length > REASON_MAX_LENGTH) throw new AppError(`Le motif ne peut dépasser ${REASON_MAX_LENGTH} caractères`, 400);

    const center = await Center.findOne({ _id: toCenterId, deleted: { $ne: true } }).select('_id');
    if (!center) throw new AppError('Centre de destination introuvable', 404);

    user.pendingCenterTransfer = { toCenterId, reason };
    await user.save();
}

/** Annule la demande de mutation de l'utilisateur */
export async function cancelCenterTransfer (userId) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    if (!user.pendingCenterTransfer) throw new AppError('Aucune demande de mutation en cours', 404);

    user.pendingCenterTransfer = null;
    await user.save();
}
