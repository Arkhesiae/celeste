import User from '../models/User.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/email/resetPassword.js';
import dotenv from 'dotenv';

dotenv.config();



const authController = {
    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;
            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ message: 'Aucun utilisateur trouvé avec cet email' });
            }

            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = Date.now() + 3600000; // 1 heure

            user.resetPasswordToken = resetToken;
            user.resetPasswordExpires = resetTokenExpiry;
            await user.save();

            
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

            // Envoyer l'email de réinitialisation en production
            try {

                // En mode développement, afficher le code dans la console
                if (process.env.NODE_ENV !== 'production') {
                    console.log('\n=== MODE DÉVELOPPEMENT ===');
                    console.log(`📧 Email: ${email}`);
                    console.log(`🔑 Reset Link: ${resetLink}`);
                    console.log('========================\n');
                } else {
                    // En production, envoyer l'email
                    await sendPasswordResetEmail(email, resetLink, user.firstName || user.name || '');
                }


                res.json({
                    message: 'Un email de réinitialisation a été envoyé à votre adresse email',
                    resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
                });
            } catch (emailError) {
                console.error('Erreur lors de l\'envoi de l\'email:', emailError);

                // En cas d'erreur d'envoi d'email, nettoyer le token
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save();

                return res.status(500).json({
                    message: 'Erreur lors de l\'envoi de l\'email de réinitialisation. Veuillez réessayer.'
                });
            }
        } catch (error) {
            console.error('Erreur lors de la demande de réinitialisation:', error);
            res.status(500).json({ message: 'Une erreur est survenue' });
        }
    },

    resetPassword: async (req, res) => {
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
    },

    verifyPassword: async (req, res) => {
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
    },

    updatePassword: async (req, res) => {
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
    }
};

export default authController; 