const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Configuration de l'URL de base
const BASE_URL = process.env.FRONTEND_URL;

exports.requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000;

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = resetTokenExpiry;
        await user.save();

        const resetLink = `${BASE_URL}/reset-password?token=${resetToken}`;

        res.json({ 
            message: 'Un email de réinitialisation a été envoyé',
            resetLink: resetLink
        });
    } catch (error) {
        console.error('Erreur lors de la demande de réinitialisation:', error);
        res.status(500).json({ message: 'Une erreur est survenue' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token invalide ou expiré' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Mot de passe réinitialisé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du mot de passe:', error);
        res.status(500).json({ message: 'Une erreur est survenue' });
    }
};

exports.verifyPassword = async (req, res) => {
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
};

exports.updatePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.user.userId);

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
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
}; 