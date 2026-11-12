import User, { LegacyUser } from '../../models/User.js';
import { findOrThrow } from '../../utils/mongo.js';
import { AppError } from '../../error/AppError.js';
import { sendEmailApproval, sendEmailRejection } from '../email/approvalEmail.js';

/**
 * Compte d'un utilisateur : disponibilité de l'e-mail, approbation d'une inscription, rôle d'administrateur,
 * rattachement à un centre, suppression.
 */

/** Disponibilité d'une adresse e-mail (et existence d'un ancien compte du même e-mail) */
export async function checkEmailAvailability (email) {
    const existingUser = await User.findOne({ email });
    const existingLegacyUser = await LegacyUser.findOne({ email });
    return { available: !existingUser, legacy: !!existingLegacyUser };
}

/** Supprime un compte par identifiant ; 404 s'il n'existe pas */
export async function deleteUserById (id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
        throw new AppError('User not found.', 404);
    }
}

/** Approuve une inscription et prévient l'utilisateur par e-mail */
export async function approveUser (id) {
    const user = await User.findByIdAndUpdate(id, { registrationStatus: 'verified' }, { new: true });
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    await sendEmailApproval(user.email);
    return user;
}

/** Rejette une inscription en attente : supprime le compte et prévient l'utilisateur par e-mail */
export async function rejectPendingUser (id) {
    const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
    if (user.registrationStatus !== 'pending') {
        throw new AppError('L\'utilisateur n\'est pas en attente d\'approbation', 400);
    }
    await User.findByIdAndDelete(id);
    await sendEmailRejection(user.email);
    return user;
}

/** Promeut un utilisateur administrateur local de son centre */
export async function makeUserLocalAdmin (id) {
    const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
    if (!user.centerId) {
        throw new AppError('Aucun centre trouvé pour cet utilisateur', 404);
    }

    user.isAdmin = true;
    user.adminType = "local";
    await user.save();
}

/** Retire le rôle d'administrateur ; refusé pour le dernier administrateur local d'un centre */
export async function removeUserAdmin (id) {
    const user = await findOrThrow(User, id, { message: 'Utilisateur non trouvé' });
    if (user.isAdmin && user.adminType === 'local') {
        const centerAdmins = await User.countDocuments({
            centerId: user.centerId,
            isAdmin: true,
            adminType: 'local'
        });

        if (centerAdmins <= 1) {
            throw new AppError('Impossible de retirer le statut admin : c\'est le dernier administrateur du centre', 400);
        }
    }

    user.isAdmin = false;
    user.adminType = null;
    await user.save();
}

/** Rattache un utilisateur à un centre : ses équipes sont réinitialisées */
export async function assignUserToCenter (userId, centerId) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    if (user.centerId === centerId) {
        throw new AppError('L\'utilisateur est déjà assigné à ce centre', 400);
    }

    user.centerId = centerId;
    user.teams = [];
    user.isLocalAdmin = false;
    await user.save();
}
