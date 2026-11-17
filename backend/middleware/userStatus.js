import User from '../models/User.js';
import { AppError } from '../error/AppError.js';

/**
 * Etat du compte de l'appelant, en deux middleware qui s'enchaînent :
 *
 *   1. verifyUserActive ............ dans `verifyToken` (authMiddleware.js), donc sur toute route authentifiée : relit le compte en
 *                                    base (le jeton d'accès, valable 15 min, ne dit rien d'une désactivation récente), refuse un
 *                                    compte inactif ou supprimé (403 ACCOUNT_INACTIVE) et passe le compte au suivant dans
 *                                    `req.accountStatus`
 *   2. hasNoPendingCenterTransfer .. à poser, après `verifyToken`, sur chaque route qui modifie des données (équipes, points,
 *                                    remplacements, planning) : lit `req.accountStatus` (aucune requête en base) et refuse un
 *                                    utilisateur dont la mutation vers un autre centre est en attente (`User.pendingCenterTransfer`),
 *                                    403 CENTER_TRANSFER_PENDING. Les routes de lecture n'en ont pas besoin.
 *
 * Un utilisateur dont la mutation est en attente se connecte et lit ses données normalement. Un compte inactif ne se connecte
 * pas : `assertUserActive` sert aussi à `loginUser` et `refreshAccessToken`. Jamais de 409 : le front le lit comme une demande
 * d'approbation.
 */

/** Refuse un compte désactivé. `user` : document ou objet simple avec `isActive` ; un compte introuvable est refusé aussi. */
export const assertUserActive = (user) => {
    if (!user || user.isActive === false) {
        throw new AppError('Ce compte est désactivé. Contactez un administrateur de votre centre.', 403, 'ACCOUNT_INACTIVE');
    }
};

export const verifyUserActive = async (req, res, next) => {
    try {
        const user = await User.findById(req.user?.userId).select('isActive pendingCenterTransfer').lean();
        assertUserActive(user);
        req.accountStatus = user;
        next();
    } catch (err) {
        next(err);
    }
};

/** À poser sur les routes qui modifient des données : refuse un utilisateur dont la mutation vers un autre centre est en attente. */
export const hasNoPendingCenterTransfer = (req, res, next) => {
    if (!req.accountStatus) {
        return next(new AppError('Etat du compte non chargé : verifyToken doit précéder.', 500));
    }
    if (req.accountStatus.pendingCenterTransfer) {
        return next(new AppError('Votre demande de mutation est en attente : vous pouvez consulter vos données mais pas les modifier.', 403, 'CENTER_TRANSFER_PENDING'));
    }
    next();
};
