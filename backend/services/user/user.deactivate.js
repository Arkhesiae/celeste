import User from '../../models/User.js';
import PointTransfer from '../../models/PointTransfer.js';
import { findOrThrow, inTransaction } from '../../utils/mongo.js';
import { fullName } from '../../utils/names.js';
import { sameId } from '../../utils/ids.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { AppError } from '../../error/AppError.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import { endTeamMembership } from '../team/team.membership.js';
import { notifyDemandChanges } from '../email/demand/demand.changeNotifications.js';
import { notifyPointTransferCancelled } from '../email/email.pointTransfer.js';
import { notifyAccountDeactivated } from '../email/email.accountDeactivated.js';
import { describePendingTransfers, previewUserPeriodImpact, sanitizeUserPeriod } from './user.sanitizePeriod.js';
import { isLastCenterAdmin } from './user.account.js';

/**
 * Désactivation d'un compte (suppression « douce ») et réactivation. Rien n'est effacé : le compte ne peut plus se connecter ni agir
 * (`isActive: false`, voir middleware/userStatus.js) et disparaît des listes de membres. La suppression définitive est dans
 * user.delete.js.
 *
 * À la désactivation, dans une seule transaction (replica set requis, known issue #21) :
 *  - la période à venir, à partir d'aujourd'hui (jour de son centre), est assainie (`sanitizeUserPeriod`, comme pour un changement
 *    d'équipe) : ses demandes sont annulées (celles qui en dépendaient aussi), il est retiré de celles qu'il avait acceptées, qui
 *    rouvrent, et ses entrées de calendrier liées à une vacation sont désactivées ;
 *  - il n'appartient plus à aucune équipe à partir d'aujourd'hui (`endTeamMembership` : les équipes passées restent, le planning
 *    passé en dépend ; renforts en cours arrêtés la veille, affectations à venir retirées, marque « sans équipe ») ;
 *  - ses transferts de points différés manuels en attente sont annulés. Ceux liés à une demande qui reste (travail déjà fait) suivent
 *    leur cours ; ceux des demandes annulées le sont avec elles ;
 *  - sa demande de mutation en attente disparaît et ses sessions sont fermées (jetons de rafraîchissement effacés).
 * Restent tels quels : équipes passées, notes, entrées de calendrier sans vacation (congé, formation...), solde, rôle d'administrateur et tout
 * le passé. La réactivation ne rétablit rien de ce qui a été annulé, désactivé ou retiré :
 * une équipe doit être réassignée.
 */

/**
 * Qui peut désactiver ou réactiver qui (la garde de la route, `authorizeSelfOrCenterAdmin`, limite déjà un administrateur local à
 * son centre) : jamais soi-même ; le compte d'un administrateur est réservé à l'administrateur principal.
 * @param {{ userId: string, isAdmin: boolean, adminType: string }} actor
 */
const assertCanManage = (target, actor) => {
    if (!actor?.isAdmin) throw new AppError("Accès refusé. Droits d'administrateur requis.", 403);
    if (sameId(target._id, actor.userId)) {
        throw new AppError('Vous ne pouvez pas désactiver ou réactiver votre propre compte', 400, 'CANNOT_DEACTIVATE_SELF');
    }
    if (target.isAdmin && actor.adminType !== 'master') {
        throw new AppError("Seul l'administrateur principal peut désactiver ou réactiver un administrateur", 403);
    }
};

const assertStillActive = (user) => {
    if (user.isActive === false) throw new AppError('Ce compte est déjà désactivé', 400, 'ACCOUNT_ALREADY_INACTIVE');
};

const upcomingPeriodOf = async (user) => ({ from: todayIn(await getCenterTimeZone(user.centerId)).toString() });

/** Les transferts différés saisis à la main (sans demande), envoyés ou reçus, qui n'auront pas lieu */
const manualPendingTransfers = (userId) => ({ request: null, $or: [{ sender: userId }, { receiver: userId }] });

/**
 * Ce que la désactivation ferait, sans rien modifier : à montrer à l'administrateur avant confirmation. `pendingTransfers` : les
 * transferts manuels ; ceux liés à une demande annulée sont portés par elle (`demands[].transfers`).
 * @returns {Promise<{ user: Object, from: string, demands: Array, entries: Array, pendingTransfers: Array, isLastCenterAdmin: boolean }>}
 */
export async function previewUserDeactivation (userId, { actor } = {}) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    assertCanManage(user, actor);
    assertStillActive(user);

    const period = await upcomingPeriodOf(user);
    const { demands, entries } = await previewUserPeriodImpact(user._id, period);

    return {
        user: { _id: user._id, name: fullName(user), email: user.email },
        from: period.from,
        demands,
        entries,
        pendingTransfers: await describePendingTransfers(manualPendingTransfers(user._id)),
        isLastCenterAdmin: await isLastCenterAdmin(user),
    };
}

/**
 * Désactive le compte (voir en tête du fichier). Les mails partent après la validation.
 * @returns {Promise<{ cancelled: number, withdrawn: number }>}
 */
export async function deactivateUser (userId, { actor } = {}) {
    const done = await inTransaction(async (session) => {
        const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', session });
        assertCanManage(user, actor);
        assertStillActive(user);

        const period = await upcomingPeriodOf(user);
        const sanitized = await sanitizeUserPeriod(user._id, period, { session });

        const transferIds = (await PointTransfer.find({ ...manualPendingTransfers(user._id), status: 'pending' }, '_id', { session }))
            .map((transfer) => transfer._id);
        await PointTransfer.updateMany({ _id: { $in: transferIds } }, { $set: { status: 'cancelled' } }, { session });

        // updateOne et non save : un ancien compte qui ne passe plus la validation du schéma doit pouvoir être désactivé
        await User.updateOne(
            { _id: user._id },
            { $set: {
                isActive: false,
                teams: endTeamMembership(user.teams, period.from),
                pendingCenterTransfer: null,
                refreshTokens: [],
            } },
            { session },
        );

        return { ...sanitized, transferIds };
    });

    // Après le commit uniquement. La personne désactivée ne reçoit que le mail de désactivation ; ces fonctions ne lèvent jamais
    notifyDemandChanges({
        cancelledIds: done.cancelled,
        withdrawn: done.withdrawn.map((demandId) => ({ demandId, accepterId: userId })),
        actorId: actor.userId,
        excludedUserIds: [String(userId)],
    });
    for (const transferId of done.transferIds) {
        await notifyPointTransferCancelled(transferId, 'accountDeactivated');
    }
    await notifyAccountDeactivated(userId);

    return { cancelled: done.cancelled.length, withdrawn: done.withdrawn.length };
}

/** Réactive un compte désactivé : il peut de nouveau se connecter. Ce qui a été annulé à la désactivation le reste. */
export async function reactivateUser (userId, { actor } = {}) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    assertCanManage(user, actor);
    if (user.isActive !== false) throw new AppError('Ce compte est déjà actif', 400, 'ACCOUNT_ALREADY_ACTIVE');

    await User.updateOne({ _id: user._id }, { $set: { isActive: true } });
}
