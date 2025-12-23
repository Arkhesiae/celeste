import User from '../../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';


const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret';
const ACCESS_TOKEN_EXPIRY = '10s';
const REFRESH_TOKEN_EXPIRY = '365d';

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
    const token = jwt.sign(
      { userId },
      JWT_REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    const expiresAt = new Date(decoded.exp * 1000);
    console.log("expiresAt", expiresAt);

    return {
        token,
        expiresAt: new Date(decoded.exp * 1000)
    };
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
      throwAuthError('INVALID_REFRESH_TOKEN', 'Session invalide ou expirée');
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
        throwAuthError('USER_NOT_FOUND', 'E-mail invalide, aucun utilisateur trouvé');
    }

    // Vérification du mot de passe
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
        throwAuthError('INVALID_PASSWORD', 'Mot de passe invalide');
    }

    // Génération des tokens
    const accessToken = generateAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin,
        adminType: user.adminType
    });

    const { token: refreshToken, expiresAt } = generateRefreshToken(user._id);

    const now = new Date();
    user.refreshTokens = user.refreshTokens.filter(rt => rt.expiresAt > now);

    user.refreshTokens.push({ token: refreshToken, createdAt: new Date(), expiresAt });
    

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
    const payload = verifyRefreshToken(refreshToken);


    const user = await User.findById(payload.userId);
    if (!user) {
        throwAuthError('USER_NOT_FOUND', 'Utilisateur non trouvé');
    }

  
    const now = new Date();
    const validTokens = user.refreshTokens.filter(rt => rt.expiresAt > now);


    const tokenIndex = validTokens.findIndex(rt => rt.token === refreshToken);
    if (tokenIndex === -1) {
        throwAuthError('TOKEN_INVALID', 'Token invalide');
    }   

  

    const newAccessToken = generateAccessToken({
        userId: user._id,
        isAdmin: user.isAdmin,
        adminType: user.adminType
    });

    user.refreshTokens = validTokens;
    await user.save();

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


function throwAuthError(code, message) {
    const error = new Error(message);
    error.code = code;
    error.status = 401;
    throw error;
}
