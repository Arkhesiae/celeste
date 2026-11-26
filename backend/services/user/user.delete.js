import fs from 'fs';
import path from 'path';
import User, { LegacyUser } from '../../models/User.js';
import Demand from '../../models/Demand.js';
import { CalendarEntry } from '../../models/CalendarEntry.js';
import DayComment from '../../models/DayComment.js';
import PointTransfer from '../../models/PointTransfer.js';
import Ticket from '../../models/Ticket.js';
import Message from '../../models/Message.js';
import Otp from '../../models/Otp.js';
import Banner from '../../models/Banner.js';
import Center from '../../models/Center.js';
import Announcement from '../../models/Announcement.js';
import { AVATARS_DIRECTORY } from '../../config/paths.js';
import { findOrThrow, inTransaction } from '../../utils/mongo.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { fullName } from '../../utils/names.js';
import { sameId } from '../../utils/ids.js';
import { AppError } from '../../error/AppError.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import { sendMassEmail } from '../email/email.transport.js';
import { buildPointTransferMails } from '../email/email.pointTransfer.js';
import { notifyDemandChanges } from '../email/demand/demand.changeNotifications.js';
import { previewUserPeriodImpact, sanitizeUserPeriod } from './user.sanitizePeriod.js';

/**
 * Suppression définitive d'un compte et de tout ce qui le concerne (réservée à l'administrateur principal).
 *
 * Ce qui touche d'autres utilisateurs :
 *  - à partir d'aujourd'hui (jour de son centre), ses demandes sont annulées (celles qui en dépendaient aussi) et il est retiré de
 *    celles qu'il avait acceptées, qui rouvrent : comme pour tout changement de planning, les collègues sont prévenus par email ;
 *  - le passé des collègues ne change pas : leurs propres entrées de calendrier restent (sans elles, un collègue remplacé paraîtrait
 *    avoir travaillé). Les demandes qu'il avait acceptées restent à leur auteur, sans accepteur ;
 *  - ses transferts de points sont effacés (les soldes des autres ne bougent pas, la ligne disparaît de leur historique) ; ceux qui
 *    étaient en attente n'auront pas lieu, l'autre personne est prévenue ;
 *  - les bannières qu'il a écrites restent, sans auteur (ce sont des messages du centre).
 *
 * Toutes les écritures sont dans une transaction : tout est supprimé, ou rien. Il faut donc un replica set (known issue #21).
 */

const PERSON_FIELDS = 'name lastName email personalData.phoneNumber';
const TRANSFER_USER_FIELDS = 'name lastName email isActive preferences points';

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** L'adresse exacte, sans tenir compte de la casse (les collections par adresse ne la normalisent pas toutes) */
const sameAddress = (email) => new RegExp(`^${escapeRegExp(email.trim())}$`, 'i');

/** Les filtres de ce qui appartient au compte : les mêmes pour compter (aperçu) et pour supprimer */
const ownedBy = (user) => {
    const email = user.email ? sameAddress(user.email) : null;
    const byAddress = (field) => (email ? [{ [field]: email }] : []);
    return {
        calendarEntries: [CalendarEntry, { userId: user._id }],
        dayNotes: [DayComment, { userId: user._id }],
        ownDemands: [Demand, { posterId: user._id }],
        pointTransfers: [PointTransfer, { $or: [{ sender: user._id }, { receiver: user._id }] }],
        tickets: [Ticket, { $or: [{ senderId: user._id }, ...byAddress('senderEmail')] }],
        messages: [Message, { $or: [{ senderId: user._id }, { receiverId: user._id }, ...byAddress('senderEmail')] }],
        // l'ancien compte (nom, téléphone, mot de passe de l'ancien site) et les codes envoyés à son adresse
        legacyAccounts: [LegacyUser, email ? { email } : { _id: null }],
        verificationCodes: [Otp, email ? { email } : { _id: null }],
    };
};

/** Un administrateur ne se supprime pas lui-même (il resterait au moins lui : le dernier administrateur principal est protégé) */
const assertDeletable = (userId, actorId) => {
    if (sameId(userId, actorId)) {
        throw new AppError('Vous ne pouvez pas supprimer votre propre compte', 400, 'CANNOT_DELETE_SELF');
    }
};

const upcomingPeriodOf = async (user) => ({ from: todayIn(await getCenterTimeZone(user.centerId)).toString() });

/** Les demandes d'autres auteurs qu'il avait acceptées (celles à venir, une fois le désistement fait, ne le sont plus) */
const acceptedForOthers = (userId) => ({ accepterId: userId, posterId: { $ne: userId } });

/**
 * Ce que la suppression ferait, sans rien modifier : à montrer à l'administrateur avant confirmation.
 * @returns {Promise<{ user: Object, from: string, demands: Array, entriesToDeactivate: number, counts: Object, isLastCenterAdmin: boolean }>}
 */
export async function previewUserDeletion (userId, { actorId } = {}) {
    assertDeletable(userId, actorId);
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const period = await upcomingPeriodOf(user);
    const upcoming = await previewUserPeriodImpact(user._id, period);

    const counts = {};
    for (const [name, [Model, filter]] of Object.entries(ownedBy(user))) {
        counts[name] = await Model.countDocuments(filter);
    }
    counts.pastAcceptedDemands = await Demand.countDocuments({
        ...acceptedForOthers(user._id),
        _id: { $nin: upcoming.demands.map((demand) => demand.id) },
    });
    counts.pendingTransfers = await PointTransfer.countDocuments({ status: 'pending', $or: [{ sender: user._id }, { receiver: user._id }] });
    counts.banners = await Banner.countDocuments({ createdBy: user._id });

    const isLastCenterAdmin = Boolean(user.isAdmin && user.adminType === 'local' && user.centerId)
        && await User.countDocuments({ centerId: user.centerId, isAdmin: true, adminType: 'local', _id: { $ne: user._id } }) === 0;

    return {
        user: { _id: user._id, name: fullName(user), email: user.email },
        from: period.from,
        demands: upcoming.demands,
        entriesToDeactivate: upcoming.entries.length,
        counts,
        isLastCenterAdmin,
    };
}

/** Les mails à la personne en face d'un transfert de points différé qui n'aura pas lieu (construits tant que le transfert existe) */
const pendingTransferMails = async (user, session) => {
    const transfers = await PointTransfer.find({ type: 'transfer', status: 'pending', request: null, $or: [{ sender: user._id }, { receiver: user._id }] })
        .populate('sender', TRANSFER_USER_FIELDS)
        .populate('receiver', TRANSFER_USER_FIELDS)
        .session(session);

    return transfers
        .filter((transfer) => transfer.sender && transfer.receiver)
        .flatMap((transfer) => buildPointTransferMails(transfer, { event: 'cancelled', reason: 'accountDeleted' }))
        .filter((mail) => mail.to !== user.email);
};

/** Supprime l'avatar téléversé par le compte, s'il n'est à personne d'autre ; un échec est journalisé, rien de plus */
const removeAvatarFile = async (avatar) => {
    if (!avatar?.startsWith('/avatars/')) return;
    const file = path.join(AVATARS_DIRECTORY, path.basename(avatar));
    try {
        if (await User.exists({ avatar })) return;
        await fs.promises.rm(file, { force: true });
    } catch (error) {
        console.error(`Avatar non supprimé (${file}) :`, error.message);
    }
};

const updateMany = (filter, update) => ({ updateMany: { filter, update } });

/**
 * Les écritures qui retirent le compte des demandes des autres, pour un `bulkWrite`. Elles s'exécutent dans l'ordre du tableau (un
 * `bulkWrite` est ordonné par défaut), et il compte : la clôture lit `accepterId`, que l'écriture suivante efface.
 */
const otherDemandsWrites = async (userId, session) => {
    const ownIds = (await Demand.find({ posterId: userId }, '_id').session(session)).map((demand) => demand._id);
    const viewerLists = ['seenBy', 'consultedBy', 'interested'];

    return [
        // une demande passée restée « acceptée » est close comme le ferait la tâche d'expiration
        updateMany({ ...acceptedForOthers(userId), status: 'accepted' }, { $set: { status: 'completed', deleted: true } }),
        updateMany(acceptedForOthers(userId), { $set: { accepterId: null, accepterShift: null } }),
        updateMany(
            { $or: viewerLists.map((field) => ({ [field]: userId })) },
            { $pull: Object.fromEntries(viewerLists.map((field) => [field, userId])) },
        ),
        updateMany({ reservedForUserId: userId }, { $set: { reservedForUserId: null } }),
        updateMany({ dependsOn: { $in: ownIds } }, { $pull: { dependsOn: { $in: ownIds } } }),
    ];
};

/** Ses lectures de bannières disparaissent ; les bannières qu'il a écrites restent, sans auteur */
const bannerWrites = (userId) => [
    updateMany({ 'acknowledgedBy.userId': userId }, { $pull: { acknowledgedBy: { userId } } }),
    updateMany({ createdBy: userId }, { $set: { createdBy: null } }),
];

/** Tout ce qui est écrit, dans la session fournie. L'ordre compte : ce que les mails doivent lire est lu avant d'être effacé */
const purge = async (userId, session) => {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé', session });

    // 1. à venir : annulations, désistements, restauration des plannings des collègues (la même opération qu'un changement d'équipe)
    const { cancelled, withdrawn } = await sanitizeUserPeriod(user._id, await upcomingPeriodOf(user), { session });

    // 2. ce que les mails liront après la validation, tant que tout existe encore
    const mailData = {
        demands: await Demand.find({ _id: { $in: [...cancelled, ...withdrawn] } })
            .populate([{ path: 'posterId', select: PERSON_FIELDS }, { path: 'accepterId', select: PERSON_FIELDS }])
            .session(session),
        accepters: [await User.findById(user._id).select(PERSON_FIELDS).session(session)],
        excludedUserIds: [String(user._id)],
    };
    const transferMails = await pendingTransferMails(user, session);

    // 3. les demandes des autres : il n'y figure plus
    await Demand.bulkWrite(await otherDemandsWrites(user._id, session), { session });

    // 4. sa trace dans ce qui appartient à d'autres
    await Banner.bulkWrite(bannerWrites(user._id), { session });
    await Center.updateMany({ admins: user._id }, { $pull: { admins: user._id } }, { session });
    if (user.email) {
        const address = sameAddress(user.email);
        await Announcement.updateMany({ 'results.errors.email': address }, { $pull: { 'results.errors': { email: address } } }, { session });
    }

    // 5. ce qui est à lui, puis le compte
    for (const [Model, filter] of Object.values(ownedBy(user))) {
        await Model.deleteMany(filter, { session });
    }
    await User.deleteOne({ _id: user._id }, { session });

    return { cancelled, withdrawn, mailData, transferMails, avatar: user.avatar };
};

/**
 * Supprime définitivement le compte et tout ce qui le concerne (voir en tête du fichier). Irréversible.
 * @param {string} userId
 * @param {{ actorId?: string }} [opts] - l'administrateur qui supprime : ne peut pas se supprimer, et n'est pas notifié
 * @returns {Promise<{ cancelled: number, withdrawn: number }>}
 */
export async function deleteUserCompletely (userId, { actorId } = {}) {
    assertDeletable(userId, actorId);

    const done = await inTransaction((session) => purge(userId, session));

    // Après la validation uniquement : une suppression annulée n'envoie rien et ne touche à aucun fichier
    notifyDemandChanges({
        cancelledIds: done.cancelled,
        withdrawn: done.withdrawn.map((demandId) => ({ demandId, accepterId: userId })),
        actorId,
        loaded: done.mailData,
    });
    if (done.transferMails.length) {
        sendMassEmail(done.transferMails).catch((error) => console.error('❌ Erreur envoi email de transfert annulé :', error));
    }
    await removeAvatarFile(done.avatar);

    return { cancelled: done.cancelled.length, withdrawn: done.withdrawn.length };
}
