import emailService from './emailService.js';
import { renderMail } from '../../src/mail/mailRenderer.js';

/**
 * Envoie un email d'annonce en masse à tous les utilisateurs
 * @param {string[]} userEmails - Liste des emails des destinataires
 * @param {string} templateType - Type de template ('maintenance', 'update', 'general')
 * @param {Object} data - Données pour le template
 * @returns {Object} Résultat de l'envoi
 */
async function sendBulkAnnouncementEmail(userEmails, templateData) {


  const { subject, html, text } = {
    subject: templateData.title,
    html: renderMail('announcement', templateData),
    text: `Bonjour,

${templateData.message}

Cordialement,
L'équipe Celeste`
  };

  const mailOptions = {
    from: 'Celeste <notification@celeste-app.fr>',
    subject,
    html,
    text
  };

  return await emailService.sendBulkEmail(userEmails, mailOptions);
}





export { 
  sendBulkAnnouncementEmail, 
};
