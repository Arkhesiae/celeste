import User from '../models/User.js';
import { AppError } from '../error/AppError.js';
import { isValidId } from '../utils/validation.js';

/**
 * Cloisonnement par centre des routes en lecture (à placer après verifyToken).
 * Un administrateur master voit tous les centres ; les autres uniquement leur centre.
 * Fail-closed : un appelant sans centre est refusé.
 */

const loadCaller = async (req) => {
    const caller = await User.findById(req.user.userId).select('centerId adminType').lean();
    if (!caller) throw new AppError('Utilisateur non trouvé.', 404);
    return caller;
};

const sameCenter = (a, b) => Boolean(a && b && String(a) === String(b));

/** La route cible un centre (`req.params[param]`) : l'appelant doit en faire partie. */
export const authorizeCenterParam = (param = 'centerId') => async (req, res, next) => {
    try {
        const centerId = req.params[param];
        if (!isValidId(centerId)) throw new AppError('ID de centre invalide.', 400);

        const caller = await loadCaller(req);
        if (caller.adminType !== 'master' && !sameCenter(caller.centerId, centerId)) {
            throw new AppError('Accès refusé. Cette ressource appartient à un autre centre.', 403);
        }
        next();
    } catch (err) {
        next(err);
    }
};

/**
 * La route cible un utilisateur (`req.params[param]`) : soi-même, ou un utilisateur du même centre.
 * (Contrairement à checkUserCenter, ne laisse jamais passer si le paramètre est absent.)
 */
export const authorizeTargetUserCenter = (param = 'id') => async (req, res, next) => {
    try {
        const targetId = req.params[param];
        if (!isValidId(targetId)) throw new AppError('ID utilisateur invalide.', 400);

        const caller = await loadCaller(req);
        if (caller.adminType === 'master' || String(req.user.userId) === String(targetId)) return next();

        const target = await User.findById(targetId).select('centerId').lean();
        if (!target) throw new AppError('Utilisateur non trouvé.', 404);
        if (!sameCenter(caller.centerId, target.centerId)) {
            throw new AppError('Accès refusé. Cet utilisateur appartient à un autre centre.', 403);
        }
        next();
    } catch (err) {
        next(err);
    }
};
