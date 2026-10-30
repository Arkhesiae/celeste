import User from "../../models/User.js";
import { AppError } from "../../error/AppError.js";
import { userPayload } from "./auth.js";
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = '180d';

/**
 * Génère un access token JWT
 * @param {Object} payload - Données à inclure dans le token
 * @returns {string} Access token
 */
export function generateAccessToken (payload) {
    return jwt.sign(
        { userId: payload.userId, isAdmin: payload.isAdmin, adminType: payload.adminType },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

/**
 * Génère un refresh token valable 365 jours
 * @param {string} userId - ID de l'utilisateur
 * @returns {string} Refresh token
 */
export const generateRefreshToken = (userId) => {
    const token = jwt.sign(
        { userId },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    const expiresAt = new Date(decoded.exp * 1000);

    return {
        token,
        expiresAt
    };
};

/**
 * Vérifie et décode un refresh token JWT
 * @param {string} refreshToken - Refresh token à vérifier
 * @returns {object} Payload décodé du token
 * @throws {AuthError} Si le token est invalide ou expiré
 */
export function verifyRefreshToken (refreshToken) {
    try {
        return jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
        throw new AppError('Session invalide ou expirée', 401, 'INVALID_REFRESH_TOKEN');
    }
}


/**
 * Rafraîchit un access token à partir d'un refresh token
 * @param {string} refreshToken - Refresh token valide
 * @returns {Promise<Object>} Nouveau access token et refresh token
 */
export async function refreshAccessToken (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);

    const user = await User.findById(payload.userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404, 'USER_NOT_FOUND');
    }

    const now = new Date();
    const validTokens = user.refreshTokens.filter(rt => rt.expiresAt > now);
    const tokenIndex = validTokens.findIndex(rt => rt.token === refreshToken);

    if (tokenIndex === -1) {
        throw new AppError('Token invalide', 401, 'TOKEN_INVALID');
    }

    const newAccessToken = generateAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin,
        adminType: user.adminType
    });

    user.refreshTokens = validTokens;
    await user.save();

    const userData = userPayload(user, newAccessToken);

    return {
        userData,
        accessToken: newAccessToken,
    };
}

