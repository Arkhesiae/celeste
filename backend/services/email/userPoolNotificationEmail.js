import emailService from './emailService.js';
import { buildUserPoolNotificationEmail, buildAcceptedDemandEmail, buildCancelledAcceptanceEmail } from './demandEmailModels.js';

/**
 * Envoie un email de notification aux utilisateurs du pool concernant une demande publiée
 * @param {Array} userPool - Liste des utilisateurs du pool (doit contenir email, name, lastName)
 * @param {Object} demandeur - L'utilisateur qui a posté la demande
 * @param {Object} demand - La demande de substitution
 * @param {string} shiftDay - Le jour du shift concerné
 * @returns {Object} Résultat de l'envoi
 */
async function sendUserPoolNotification(userPool, demand) {
  try {
    // Extraire les emails des utilisateurs du pool
    const userEmails = userPool
      .filter(user => user.email && user.email.trim())
      .map(user => user.email);

    if (userEmails.length === 0) {
      console.log('⚠️ Aucun email valide trouvé dans le pool d\'utilisateurs');
      return {
        total: 0,
        sent: 0,
        failed: 0,
        errors: []
      };
    }

    // Générer le contenu de l'email
    const { subject, html, text } = buildUserPoolNotificationEmail(demand);

    // Préparer les options d'email
    const mailOptions = {
      from: 'Celeste <notification@celeste-app.fr>',
      subject,
      html,
      text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendBulkEmail(userEmails, mailOptions);

    console.log(`📧 Notifications envoyées au pool d'utilisateurs:`, {
      totalUsers: userPool.length,
      emailsSent: results.sent,
      emailsFailed: results.failed,
      demandId: demand._id,
      demandType: demand.type
    });

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications au pool d\'utilisateurs:', error);
    throw error;
  }
}

/**
 * Envoie un email de notification aux utilisateurs du pool concernant une demande publiée
 * @param {Array} userPool - Liste des utilisateurs du pool (doit contenir email, name, lastName)
 * @param {Object} demandeur - L'utilisateur qui a posté la demande
 * @param {Object} demand - La demande de substitution
 * @param {string} shiftDay - Le jour du shift concerné
 * @returns {Object} Résultat de l'envoi
 */
async function sendUserNotification(demand, type, originalAccepter) {
  try {
    // Extraire les emails des utilisateurs du pool
    const destination = demand.posterId?.email;

    let params;

    switch (type) {
      case 'accepted':
        params = buildAcceptedDemandEmail(demand);
        break;
      case 'cancelled':
        params = buildCancelledAcceptanceEmail(demand, originalAccepter);
        break;
    }

    // Préparer les options d'email

    const mailOptions = {
      to: destination,
      from: 'Celeste <notification@celeste-app.fr>',
      subject: params.subject,
      html: params.html,
      text: params.text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendEmail(mailOptions);

    console.log(`📧 Notifications envoyées:`, {
      totalUsers: 2,
      emailsSent: results.sent,
      emailsFailed: results.failed,
      demandId: demand._id,
      demandType: demand.type
    });

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications au pool d\'utilisateurs:', error);
    throw error;
  }
}




export {
  sendUserPoolNotification,
  sendUserNotification
};
