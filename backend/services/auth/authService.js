import User from '../../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const ACCESS_TOKEN_EXPIRY = '10s';
const REFRESH_TOKEN_EXPIRY = '30s';

/**
 * Génère un access token JWT
 * @param {Object} payload - Données à inclure dans le token
 * @returns {string} Access token
 */
export function generateAccessToken(payload) {
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
    return jwt.sign(
      { userId },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
  };

/**
 * Vérifie et décode un refresh token JWT
 * @param {string} refreshToken - Refresh token à vérifier
 * @returns {object} Payload décodé du token
 * @throws {AuthError} Si le token est invalide ou expiré
 */
export function verifyRefreshToken(refreshToken) {
    try {
      return jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      const error = new Error('Session invalide ou expirée');
      error.code = 'INVALID_REFRESH_TOKEN';
      error.status = 401;
      throw error;
    }
  }
  
/**
 * Authentifie un utilisateur avec email et mot de passe
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe de l'utilisateur
 * @param {boolean} stayConnected - Si true, génère un refresh token pour une connexion longue durée
 * @returns {Promise<Object>} Objet contenant les tokens et les données utilisateur
 */
export async function loginUser(email, password) {
    // Vérification si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
        const error = new Error('E-mail invalide, aucun utilisateur trouvé');
        error.code = 'USER_NOT_FOUND';
        error.status = 401;
        throw error;
    }

    // Vérification du mot de passe
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
        const error = new Error('Mot de passe invalide');
        error.code = 'INVALID_PASSWORD';
        error.status = 401;
        throw error;
    }

    // Génération des tokens
    const accessToken = generateAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin,
        adminType: user.adminType
    });

    const refreshToken = generateRefreshToken(user._id);

    // Sauvegarder le refresh token dans la base de données
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Préparer les données utilisateur à retourner
    const userData = {
        name: user.name,
        email: user.email,
        phone: user.personalData?.phoneNumber || '',
        birthDate: user.personalData?.birthDate || '',
        isAdmin: user.isAdmin,
        adminType: user.adminType,
        userId: user._id,
        preferences: user.preferences,
        centerId: user.centerId,
        avatar: user.avatar,
        status: user.registrationStatus || 'pending',
        accessToken: accessToken
    };

    return {
        userData,
        accessToken,
        refreshToken
    };
}

/**
 * Rafraîchit un access token à partir d'un refresh token
 * @param {string} refreshToken - Refresh token valide
 * @returns {Promise<Object>} Nouveau access token et refresh token
 */
export async function refreshAccessToken(refreshToken) {
    try {
        verifyRefreshToken(refreshToken);
    } catch (error) {
        throw error;
    }

    const user = await User.findOne({
        refreshToken: refreshToken,
    });

    if (!user) {
        const error = new Error('Token invalide');
        error.code = 'TOKEN_INVALID';
        error.status = 401;
        throw error;
    }

    const newAccessToken = generateAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin,
        adminType: user.adminType
    });

    const userData = {
        name: user.name,
        email: user.email,
        phone: user.personalData?.phoneNumber || '',
        birthDate: user.personalData?.birthDate || '',
        isAdmin: user.isAdmin,
        adminType: user.adminType,
        userId: user._id,
        preferences: user.preferences,
        centerId: user.centerId,
        avatar: user.avatar,
        status: user.registrationStatus || 'pending',
        accessToken: newAccessToken
    };

    return {
        userData,
        accessToken: newAccessToken,
    };
}

