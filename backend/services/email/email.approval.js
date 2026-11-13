import * as emailService from './email.transport.js';
import { renderMail } from './email.renderer.js';
/**
 * Envoie un email d'approbation d'inscription
 * @param {string} toEmail
 */
async function sendEmailApproval(toEmail) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Celeste <noreply@celeste-app.fr>',
    to: toEmail.toLowerCase(),
    subject: 'Votre inscription a été approuvée - Celeste',
    text: `Bonjour,\n\nVotre inscription a été approuvée. Vous pouvez désormais accéder à l'application.\n\nCordialement,\nL'équipe Celeste`,
    html: renderMail('userApproval', {})
  };

  try {
    await emailService.sendEmail(mailOptions);
    console.log('📧 Email approbation envoyé à:', toEmail);
  } catch (err) {
    console.error('❌ Erreur envoi approbation :', err);
    throw err;
  }
}

/**
 * Envoie un email de rejet d'inscription
 * @param {string} toEmail
 */
async function sendEmailRejection(toEmail) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Celeste <noreply@celeste-app.fr>',
    to: toEmail.toLowerCase(),
    subject: 'Votre inscription a été rejetée - Celeste',
    text: `Bonjour,\n\nVotre inscription a été rejetée. Veuillez contacter l'administrateur du site.\n\nCordialement,\nL'équipe Celeste`,
    html: renderMail('userRejection', {}),
  };

  try {
    await emailService.sendEmail(mailOptions);
    console.log('📧 Email rejet envoyé à:', toEmail);
  } catch (err) {
    console.error('❌ Erreur envoi rejet :', err);
    throw err;
  }
}

export { sendEmailApproval, sendEmailRejection }; 