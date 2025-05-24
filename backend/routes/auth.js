const express = require('express');
require('dotenv').config();
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');

// Route pour demander une réinitialisation de mot de passe
router.post('/reset-password-request', authController.requestPasswordReset);

// Route pour réinitialiser le mot de passe
router.post('/reset-password', authController.resetPassword);

// Route pour vérifier le mot de passe actuel
router.post('/verify-password', verifyToken, authController.verifyPassword);

// Route pour mettre à jour le mot de passe
router.post('/update-password', verifyToken, authController.updatePassword);

module.exports = router;
