import User from '../../models/User.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../email/resetPassword.js';

/**
 * Demande une réinitialisation de mot de passe
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise<Object>} Message de confirmation
 */
export async function requestPasswordReset (email) {
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError('Aucun utilisateur trouvé avec cet email', 404);
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valide 1 heure

    // Sauvegarder le token dans la base de données
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Générer le lien de réinitialisation
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    try {
        // Envoyer l'email de réinitialisation
        await sendPasswordResetEmail(user.email, resetLink, `${user.name} ${user.lastName}`);
    } catch (error) {
        // En cas d'erreur d'envoi d'email, nettoyer le token
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        throw new AppError('Erreur lors de l\'envoi de l\'email de réinitialisation', 500);
    }

    return {
        message: 'Un email de réinitialisation a été envoyé à votre adresse email'
    };
}

/**
 * Réinitialise le mot de passe avec un token
 * @param {string} token - Token de réinitialisation
 * @param {string} newPassword - Nouveau mot de passe
 * @returns {Promise<Object>} Message de confirmation
 */
export async function resetPassword (token, newPassword) {
    // Trouver l'utilisateur avec un token valide et non expiré
    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
        throw new AppError('Token invalide ou expiré', 400);
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et supprimer le token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return {
        message: 'Mot de passe réinitialisé avec succès'
    };
}

/**
 * Vérifie le mot de passe actuel de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} currentPassword - Mot de passe actuel
 * @returns {Promise<Object>} Résultat de la vérification
 */
export async function verifyPassword (userId, currentPassword) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
        throw new AppError('Mot de passe actuel incorrect', 401);
    }

    return {
        message: 'Mot de passe correct'
    };
}

/**
 * Met à jour le mot de passe de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} newPassword - Nouveau mot de passe
 * @returns {Promise<Object>} Message de confirmation
 */
export async function updatePassword (userId, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    user.password = hashedPassword;
    await user.save();

    return {
        message: 'Mot de passe mis à jour avec succès'
    };
}
