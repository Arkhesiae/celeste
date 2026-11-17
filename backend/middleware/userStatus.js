import User from '../models/User.js';
import { AppError } from '../error/AppError.js';

/**
 * Garde sur l'état du compte de l'appelant (à placer après verifyToken).
 *
 * Contrairement aux gardes de `centerAuth.js`, qui lisent le rôle et le centre dans le jeton d'accès (valable 15 min), ces
 * deux-là relisent le compte en base à chaque appel : un compte désactivé ou un utilisateur dont la mutation vient d'être
 * demandée est arrêté tout de suite, sans attendre l'expiration du jeton.
 *
 *   checkUserStatus() .............. compte actif (`User.isActive`), sinon 403 ACCOUNT_INACTIVE
 *   checkUserStatus({ checkCenterTransfer: true }) .. en plus, aucune demande de mutation en attente (`User.pendingCenterTransfer`), sinon 403
 *                                    CENTER_TRANSFER_PENDING
 *
 * Un utilisateur dont la mutation est en attente peut se connecter ; il ne peut pas agir sur les équipes, les points ni les
 * remplacements. Un compte inactif est refusé dès la connexion : `assertUserActive` sert à `loginUser` comme à la garde, pour
 * que le message et le code soient les mêmes des deux côtés. Jamais de 409 : le front le lit comme une demande d'approbation.
 */

export const ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE';
export const CENTER_TRANSFER_PENDING = 'CENTER_TRANSFER_PENDING';

/** Refuse un compte désactivé. `user` : document ou objet simple avec `isActive` ; un compte introuvable est refusé aussi. */
export const assertUserActive = (user) => {
    if (!user || user.isActive === false) {
        throw new AppError("Ce compte est désactivé. Contactez un administrateur de votre centre.", 403, ACCOUNT_INACTIVE);
    }
};

/** Refuse un utilisateur dont la mutation vers un autre centre est en attente. */
export const assertNoPendingCenterTransfer = (user) => {
    if (user?.pendingCenterTransfer) {
        throw new AppError("Votre demande de mutation est en attente : vous ne pouvez pas agir sur les équipes, les points ni les remplacements.", 403, CENTER_TRANSFER_PENDING);
    }
};

/** État du compte de l'appelant (jeton : `userId`), lu en base une seule fois par requête. */
const loadAccountStatus = async (req) => {
    if (req.accountStatus === undefined) {
        req.accountStatus = await User.findById(req.user?.userId).select('isActive pendingCenterTransfer').lean();
    }
    return req.accountStatus;
};

/**
 * Garde unique : le compte de l'appelant doit être actif ; avec `checkCenterTransfer`, il ne doit pas non plus avoir de mutation
 * en attente.
 *   checkUserStatus()                                compte actif
 *   checkUserStatus({ checkCenterTransfer: true })   compte actif et aucune mutation en attente
 * @param {{ checkCenterTransfer?: boolean }} [options]
 */
export const checkUserStatus = ({ checkCenterTransfer = false } = {}) => async (req, res, next) => {
    try {
        const user = await loadAccountStatus(req);
        assertUserActive(user);   // un compte supprimé ou désactivé ne passe aucune garde
        if (checkCenterTransfer) assertNoPendingCenterTransfer(user);
        next();
    } catch (err) {
        next(err);
    }
};
