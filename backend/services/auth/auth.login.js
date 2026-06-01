import User from "../../models/User.js";
import bcrypt from 'bcrypt';
import { AppError } from '../../error/appError.js';
import { generateAccessToken, generateRefreshToken } from './auth.refreshToken.js';
import { userPayload } from "./auth.js";


/**
 * Authentifie un utilisateur avec email et mot de passe²
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe de l'utilisateur
 * @returns {Promise<Object>} Objet contenant les tokens et les données utilisateur
 */
export async function loginUser (email, password) {
    // Vérification si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError('E-mail invalide, aucun utilisateur trouvé', 404, 'USER_NOT_FOUND');
    }

    // Vérification du mot de passe
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
        throw new AppError('Mot de passe invalide', 401, 'INVALID_PASSWORD');
    }

    // Génération des tokens
    const accessToken = generateAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin,
        adminType: user.adminType
    });

    const { token: refreshToken, expiresAt } = generateRefreshToken(user._id);

    const now = new Date();

    // Filtrer les tokens expirés
    user.refreshTokens = user.refreshTokens.filter(rt => rt.expiresAt > now);
    // Ajouter le nouveau token
    user.refreshTokens.push({ token: refreshToken, createdAt: new Date(), expiresAt });

    user.lastLogin = new Date();

    await user.save();

    // Préparer les données utilisateur à retourner
    const userData = userPayload(user, accessToken);

    return {
        userData,
        accessToken,
        refreshToken
    };
}