import emailService from './emailService.js';
import { renderMail } from '../../src/mail/mailRenderer.js';

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param {string} toEmail - Email de l'utilisateur
 * @param {string} resetLink - Lien de réinitialisation
 * @param {string} userName - Nom de l'utilisateur (optionnel)
 */
async function sendPasswordResetEmail(toEmail, resetLink, userName = '') {
  const templateData = {
    resetLink: resetLink,
    userName: userName || 'Utilisateur',
  };

  const html = renderMail('resetPassword', templateData);
  const text = `Bonjour ${userName || 'Utilisateur'},

Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :

${resetLink}

Important : Ce lien est valable pendant 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.

Cordialement,
L'équipe Celeste`
  

  const mailOptions = {
    from: 'Celeste <reset@celeste-app.fr>',
    to: toEmail,
    subject: 'Réinitialisation de votre mot de passe - Celeste',
    html,
    text
  };

  try {
    await emailService.sendEmail(mailOptions);
    console.log('📧 Email de réinitialisation envoyé à:', toEmail);
  } catch (err) {
    console.error('❌ Erreur envoi email de réinitialisation :', err);
    throw err;
  }
}

export { sendPasswordResetEmail }; 