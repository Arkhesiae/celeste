import emailService from './emailService.js';
import { renderMail } from '../../src/mail/mailRenderer.js';

/**
 * Envoie un OTP par email via le service configuré
 * @param {string} toEmail
 * @param {string} otp
 * @param {string} userName - Nom de l'utilisateur (optionnel)
 */
async function sendEmailOtp(toEmail, otp, userName = '') {
  
  // Préparer les données pour le template
  const templateData = {
    otpCode: otp ,
    validityMinutes: 5
  };
  
  // Générer le HTML avec le template
  const html = renderMail('otp', templateData);
  
  const mailOptions = {
    from: 'Celeste <otp@celeste-app.fr>',
    to: toEmail,
    subject: 'Votre code de vérification - Céleste',
    html,
    text: `Bonjour, voici votre code de vérification: ${otp}\nIl est valable 5 minutes.\n\nCordialement,\nL'équipe Celeste`
  };

  try {
    await emailService.sendEmail(mailOptions);
    console.log('📧 Email OTP envoyé à:', toEmail);
  } catch (err) {
    console.error('❌ Erreur envoi OTP :', err);
    throw err;
  }
}

export { sendEmailOtp }; 