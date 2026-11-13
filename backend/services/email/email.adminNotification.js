import * as emailService from './email.transport.js';
import { formatDateFr } from '../../utils/dates/format.js';
import { renderMail } from './email.renderer.js';

/**
 * Envoie un email de notification aux administrateurs d'un centre
 * @param {Array} adminEmails - Liste des emails des administrateurs
 * @param {Object} newUser - Le nouvel utilisateur créé
 * @param {Object} center - Le centre de l'utilisateur
 * @returns {Object} Résultat de l'envoi
 */
async function sendAdminNotificationEmail(adminEmails, newUser, center) {
  try {
    if (!adminEmails || adminEmails.length === 0) {
      console.log('⚠️ Aucun administrateur trouvé pour le centre:', center.name);
      return {
        total: 0,
        sent: 0,
        failed: 0,
        errors: []
      };
    }

    const templateData = {
      newUserName: newUser.name,
      newUserLastName: newUser.lastName,
      newUserEmail: newUser.email,
      newUserCenter: center.name,
      newUserCenterOACI: center.OACI,
      newUserCreatedAt: formatDateFr(newUser.createdAt, { short: true }),
      center: center
    };
    const html = renderMail('adminNotification', templateData);

    const text = `
Bonjour,

Un nouvel utilisateur s'est inscrit et nécessite votre approbation.

Veuillez vous connecter à l'interface d'administration pour examiner et approuver cette inscription.
  `;

    // Préparer les options d'email
    const mailOptions = {
      from: 'Celeste <notification@celeste-app.fr>',
      subject: `🔔 Nouvelle inscription en attente d'approbation - ${center.name}`,
      html,
      text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendBulkEmail(adminEmails, mailOptions);

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications aux administrateurs:', error);
    throw error;
  }
}

export { sendAdminNotificationEmail };
