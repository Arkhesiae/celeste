import emailService from './emailService.js';
import { renderMail } from '../../src/mail/mailRenderer.js';

/**
 * Envoie une réponse de ticket par email
 */
export const sendTicketReplyEmail = async (ticketData, replyContent, adminName = 'Support') => {
  const { senderEmail, title, _id } = ticketData;
  
  const subject = `Re: Ticket [CELESTE-${_id.toString().slice(-6)}]`;
  
  const templateData = {
    replyContent: replyContent,
    ticketId: _id.toString().slice(-6),
    title: title,
  }

  const html = renderMail('ticketReply', templateData);

  const textContent = `
Réponse à votre ticket de support
Ticket ID: [CELESTE-${_id.toString().slice(-6)}]

Bonjour,

Voici la réponse à votre demande :

${replyContent}

Cordialement,
L'équipe de support

---
Important : Pour répondre à ce message, utilisez simplement "Répondre" dans votre client email. 
Votre réponse sera automatiquement associée à ce ticket.
  `;

  const mailOptions = {
    from:  'Celeste <ticket@celeste-app.fr>',
    to: senderEmail,
    subject: subject,
    html: html,
    text: textContent,
    headers: {
      'Reply-To': 'Celeste <ticket@celeste-app.fr>',
      'X-Ticket-ID': _id.toString()
    }
  };

  try {
    const result = await emailService.sendEmail(mailOptions);
    console.log(`📧 Réponse de ticket envoyée à ${senderEmail} pour le ticket ${_id}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi réponse ticket:', error);
    throw error;
  }
};

export default {
  sendTicketReplyEmail
};
