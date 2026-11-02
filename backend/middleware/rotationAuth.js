import Rotation from '../models/Rotation.js';
import User from '../models/User.js';
import { AppError } from '../error/AppError.js';
import { isValidId } from '../utils/validation.js';

/**
 * Cloisonnement par centre des routes de modification des tours de service (à placer après verifyToken, isAdmin).
 * Un administrateur master peut agir sur tous les centres ; un administrateur local uniquement sur le sien.
 * Fail-closed : un administrateur sans centre est refusé.
 */

const loadCaller = async (req) => {
    const user = await User.findById(req.user.userId).select('centerId adminType').lean();
    if (!user) throw new AppError('Utilisateur non trouvé.', 404);
    return user;
};

const denyUnlessSameCenter = (user, centerId) => {
    if (user.adminType === 'master') return;
    if (!user.centerId || !centerId || String(user.centerId) !== String(centerId)) {
        throw new AppError('Accès refusé. Vous ne pouvez gérer que les tours de service de votre centre.', 403);
    }
};

/** Routes `/:id/...` : le tour de service ciblé doit appartenir au centre de l'administrateur. */
export const authorizeRotationAccess = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) throw new AppError('ID de rotation invalide.', 400);

        const user = await loadCaller(req);
        if (user.adminType !== 'master') {
            const rotation = await Rotation.findById(id).select('centerId').lean();
            if (!rotation) throw new AppError('Rotation non trouvée.', 404);
            denyUnlessSameCenter(user, rotation.centerId);
        }

        req.user.centerId = user.centerId;
        next();
    } catch (err) {
        next(err);
    }
};

/** Création : le `centerId` du corps doit être celui de l'administrateur. */
export const authorizeRotationCreation = async (req, res, next) => {
    try {
        const user = await loadCaller(req);
        denyUnlessSameCenter(user, req.body?.centerId);

        req.user.centerId = user.centerId;
        next();
    } catch (err) {
        next(err);
    }
};
