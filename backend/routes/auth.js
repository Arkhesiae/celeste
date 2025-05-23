const express = require('express');
require('dotenv').config();
const router = express.Router();
const { User } = require('../models/userModel');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { verifyToken } = require('../middleware/authMiddleware');

// Configuration de l'URL de base
const BASE_URL = process.env.FRONTEND_URL;

// Route pour demander une réinitialisation de mot de passe
router.post('/reset-password-request', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email' });
        }

        // Générer un token de réinitialisation
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Expire dans 1 heure

        // Sauvegarder le token dans la base de données
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        // Générer le lien de réinitialisation
        const resetLink = `${BASE_URL}/reset-password?token=${resetToken}`;

        // TODO: Envoyer l'email avec le lien de réinitialisation
        // Pour l'instant, on renvoie juste le lien dans la réponse
        res.json({ 
            message: 'Un email de réinitialisation a été envoyé',
            resetLink: resetLink // À retirer en production
        });
    } catch (error) {
        console.error('Erreur lors de la demande de réinitialisation:', error);
        res.status(500).json({ message: 'Une erreur est survenue' });
    }
});

// Route pour réinitialiser le mot de passe
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Trouver l'utilisateur avec le token valide
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token invalide ou expiré' });
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe et effacer les champs de réinitialisation
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du mot de passe:', error);
        res.status(500).json({ message: 'Une erreur est survenue' });
    }
});

// Route pour vérifier le mot de passe actuel
router.post('/verify-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const passwordMatches = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
        }

        res.json({ message: 'Mot de passe vérifié avec succès' });
    } catch (error) {
        console.error('Erreur lors de la vérification du mot de passe:', error);
        res.status(500).json({ message: 'Une erreur est survenue' });
    }
});

// Route pour mettre à jour le mot de passe
router.post('/update-password', verifyToken, async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Utiliser findOneAndUpdate pour ne mettre à jour que le mot de passe
        await User.findOneAndUpdate(
            { _id: req.user.userId },
            { $set: { password: hashedPassword } },
            { new: true, runValidators: false }
        );

        res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
        res.status(500).json({ message: 'Une erreur est survenue' });
    }
});

module.exports = router;
