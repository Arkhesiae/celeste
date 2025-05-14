// middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

/**
 * Middleware pour vérifier le token JWT d'authentification
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const verifyToken = (req, res, next) => {
    // Récupération du token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Accès non autorisé. Token manquant.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Vérification du token
        const decoded = jwt.verify(token, 'secret');
        // Ajout des informations décodées à la requête
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Erreur de vérification du token:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Token invalide ou expiré.'
        });
    }
};

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur local
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const isAdmin = (req, res, next) => {
    if (req.user && (req.user.isAdmin)) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé. Droits d\'administrateur local requis.'
        });
    }
};

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur principal
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const isMasterAdmin = (req, res, next) => {
    console.log(req.user, req.user.isAdmin, req.user.adminType)
    if (req.user && req.user.isAdmin && req.user.adminType === 'master') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé. Droits d\'administrateur princapal requis.'
        });
    }
};

/**
 * Middleware pour vérifier le centre de l'utilisateur (pour les admin locaux)
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const checkUserCenter = async (req, res, next) => {
    try {
        // Si c'est un master admin, on le laisse passer
        if (req.user.role === 'masterAdmin') {
            return next();
        }

        // Récupération de l'utilisateur cible
        const targetUserId = req.params.userId || req.body.userId;

        if (!targetUserId) {
            return next();
        }

        // Récupération des informations de l'utilisateur cible
        const targetUser = await User.findById(targetUserId);

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur cible non trouvé.'
            });
        }

        // Vérification que l'admin local est du même centre que l'utilisateur cible
        if (req.user.role === 'localAdmin' && req.user.centerId !== targetUser.centerId) {
            return res.status(403).json({
                success: false,
                message: 'Vous ne pouvez gérer que les utilisateurs de votre centre.'
            });
        }

        next();
    } catch (error) {
        console.log('Erreur lors de la vérification du centre:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Erreur serveur lors de la vérification des droits.'
        });
    }
};

/**
 * Middleware pour vérifier si l'utilisateur est soit l'utilisateur cible, soit un administrateur
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
const isUserOrAdmin = (req, res, next) => {
    const targetUserId = req.params.id;
    const currentUserId = req.user.userId;
    const isAdmin = req.user.isAdmin ;

    if (currentUserId === targetUserId || isAdmin) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Accès refusé. Vous devez être l\'utilisateur concerné ou un administrateur.'
        });
    }
};

module.exports = {
    verifyToken,
    isAdmin,
    isMasterAdmin,
    checkUserCenter,
    isUserOrAdmin
};