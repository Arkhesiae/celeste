import jwt from 'jsonwebtoken';
import { AppError } from '../error/AppError.js';
import { verifyUserActive } from './userStatus.js';

const verifyAccessToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(new AppError('Non autorisé, token manquant.', 401, 'AUTH_TOKEN_MISSING'));
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        req.user = decoded;
        next();
    } catch (err) {
        next(new AppError('Non autorisé, token expiré ou invalide.', 401, 'INVALID_ACCESS_TOKEN'));
    }
};

const isAdmin = (req, res, next) => {
    if (req.user?.isAdmin) return next();
    throw new AppError("Accès refusé. Droits d'administrateur local requis.", 403);
};

const isMasterAdmin = (req, res, next) => {
    if (req.user?.isAdmin && req.user.adminType === 'master') return next();
    throw new AppError("Accès refusé. Droits d'administrateur principal requis.", 403);
};

/**
 * Garde de toute route authentifiée, deux middleware à la suite (un tableau : `router.use(verifyToken)` et
 * `router.get(path, verifyToken, ...)` l'acceptent tels quels) :
 *   1. jeton d'accès valide ;
 *   2. compte actif, relu en base (403 ACCOUNT_INACTIVE), qui passe l'état du compte au suivant (`req.accountStatus`).
 * Les routes sans `verifyToken` (publiques, connexion, renouvellement du jeton) font leur propre contrôle. Les routes qui
 * modifient des données ajoutent `hasNoPendingCenterTransfer` (userStatus.js) après lui.
 */
const verifyToken = [verifyAccessToken, verifyUserActive];

export { verifyToken, isAdmin, isMasterAdmin };
