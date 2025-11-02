import emailService from './emailService.js';
import { renderMail } from '../../src/mail/mailRenderer.js';
import Center from '../../models/Center.js';

/**
 * Envoie un email de notification aux administrateurs concernant un nouveau ticket
 * @param {Array} adminEmails - Liste des emails des administrateurs
 * @param {Object} ticketData - Données du ticket créé
 * @param {Object} userData - Données de l'utilisateur qui a créé le ticket
 * @returns {Object} Résultat de l'envoi
 */
async function sendNewTicketNotificationEmail(adminEmails, ticketData, userData) {
  try {
    if (!adminEmails || adminEmails.length === 0) {
      console.log('⚠️ Aucun administrateur trouvé pour le ticket');
      return {
        total: 0,
        sent: 0,
        failed: 0,
        errors: []
      };
    }

    const center = await Center.findById(ticketData.centerId);
    // Déterminer si le ticket est local ou global (master)
    const isLocal = ticketData.adminType === 'local';

    const templateData = {
      isLocal: isLocal,
      ticketId: ticketData._id.toString().slice(-6),
      title: ticketData.title,
      content: ticketData.content,
      userEmail: userData.email,
      centerName: center?.name,
      creationDate: new Date(ticketData.createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    };

   

    const html = renderMail('newTicket', templateData);

    const text = `
Bonjour Administrateur,

${isLocal ? 'Un nouvel utilisateur de votre centre a créé un ticket d\'assistance.' : 'Un nouvel utilisateur a créé un ticket d\'assistance.'}

Ticket #${ticketData._id.toString().slice(-6)}
Sujet : ${ticketData.title}

Message :
${ticketData.content}

Veuillez vous connecter à l'interface d'administration pour répondre à ce ticket.
    `;

    // Préparer les options d'email
    const subject = isLocal 
      ? `Celeste - Nouveau ticket local - ${center?.name || ''}` 
      : 'Celeste - Nouveau ticket';
    
    const mailOptions = {
      from: 'Celeste <notification@celeste-app.fr>',
      subject: subject.trim(),
      html,
      text
    };

    // Envoyer les emails en masse
    const results = await emailService.sendBulkEmail(adminEmails, mailOptions);

    return results;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi des notifications de nouveau ticket:', error);
    throw error;
  }
}

export { sendNewTicketNotificationEmail };

