import * as emailService from './email.transport.js';
import { renderMail } from './mailRenderer.js';

/**
 * Envoie une réponse de ticket par email
 */
export const sendTicketReplyEmail = async (ticketData, replyContent, adminName = 'Support') => {
  const { senderEmail, title } = ticketData;
  
  const subject = `Re: Ticket [CELESTE-${ticketData.shortId}]`;
  
  const templateData = {
    replyContent: replyContent,
    ticketId: ticketData.shortId,
    title: title,
  }

  const html = renderMail('ticketReply', templateData);

  const textContent = `
Réponse à votre ticket de support
Ticket ID: [CELESTE-${ticketData.shortId}]

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
      'X-Ticket-ID': ticketData.shortId
    }
  };

  try {
    const result = await emailService.sendEmail(mailOptions);
    console.log(`📧 Réponse de ticket envoyée à ${senderEmail} pour le ticket ${ticketData.shortId}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi réponse ticket:', error);
    throw error;
  }
};
