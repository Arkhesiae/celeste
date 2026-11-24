import * as emailService from './email.transport.js';
import { renderMail } from './email.renderer.js';
import { AppError } from '../../error/AppError.js';
import { OTP_VALIDITY_MINUTES } from '../../config/auth.js';

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
    validityMinutes: OTP_VALIDITY_MINUTES
  };
  
  // Générer le HTML avec le template
  const html = renderMail('otp', templateData);
  
  const mailOptions = {
    from: 'Celeste <otp@celeste-app.fr>',
    to: toEmail,
    subject: 'Votre code de vérification - Céleste',
    html,
    text: `Bonjour, voici votre code de vérification: ${otp}\nIl est valable ${OTP_VALIDITY_MINUTES} minutes.\n\nCordialement,\nL'équipe Celeste`
  };

  // `sendEmail` ne lève jamais : un échec d'envoi se lit dans `sent`
  const result = await emailService.sendEmail(mailOptions);
  if (!result.sent) {
    throw new AppError("Impossible d'envoyer le code pour le moment, réessayez dans quelques instants", 502);
  }
  console.log('📧 Email OTP envoyé à:', toEmail);
}

export { sendEmailOtp }; 