import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { AppError } from '../error/AppError.js';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            code: 'AUTH_TOKEN_MISSING',
            success: false,
            message: 'Non autorisé, token manquant.'
        });
    }

    const token = authHeader.split(' ')[1];
    if (!token || token === 'undefined' || token === 'null') {
        return res.status(401).json({
            code: 'AUTH_TOKEN_MISSING',
            success: false,
            message: 'Non autorisé, token manquant.'
        });
    }

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

const resolveCenterId = async (req, res, next) => {
    if (req.user.adminType === 'master') return next();

    const user = await User.findById(req.user.userId).select('centerId').lean();
    if (!user) throw new AppError('Utilisateur non trouvé.', 404);

    req.user.centerId = user.centerId;
    next();
};

const checkUserCenter = async (req, res, next) => {
    if (req.user.adminType === 'master') return next();

    const targetUserId = req.params.userId || req.body.userId;
    if (!targetUserId) return next();

    const targetUser = await User.findById(targetUserId).lean();
    if (!targetUser) throw new AppError('Utilisateur cible non trouvé.', 404);

    if (!targetUser.centerId.equals(req.user.centerId)) {
        throw new AppError('Vous ne pouvez gérer que les utilisateurs de votre centre.', 403);
    }

    next();
};

const isUserOrAdmin = (req, res, next) => {
    if (req.user.userId === req.params.id || req.user.isAdmin) return next();
    next(new AppError("Accès refusé. Vous devez être l'utilisateur concerné ou un administrateur.", 403));
};

export { verifyToken, isAdmin, isMasterAdmin, checkUserCenter, isUserOrAdmin, resolveCenterId };