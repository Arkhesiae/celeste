import jwt from 'jsonwebtoken';
import { AppError } from '../error/AppError.js';

const verifyToken = (req, res, next) => {
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

export { verifyToken, isAdmin, isMasterAdmin };
