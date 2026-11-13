import { fullName } from '../../utils/names.js';
import { isValidEmail } from '../../utils/validation.js';
import { AppError } from '../../error/AppError.js';
import { sendTicketReplyEmail } from '../email/email.ticketReply.js';
import { findTicketOrThrow, populateTicket } from './ticket.read.js';

/**
 * Envoie une réponse à un ticket
 * @param {string} ticketId - ID du ticket
 * @param {string} content - Contenu de la réponse
 * @param {Object} adminUser - Utilisateur admin qui répond
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const sendTicketReply = async (ticketId, content, adminUser) => {
  const ticket = await findTicketOrThrow(ticketId);
  if (!isValidEmail(ticket.senderEmail)) throw new AppError('Email invalide', 400);

  const adminName = adminUser.name && adminUser.lastName
    ? fullName(adminUser)
    : 'Support';

  ticket.shortId = ticket._id.toString().slice(-6);
  await sendTicketReplyEmail(ticket, content, adminName);

  ticket.replies.push({
    content: content.trim(),
    senderEmail: adminUser.email,
    senderName: adminName,
    isFromAdmin: true,
    createdAt: new Date(),
  });

  ticket.replySent = true;
  await ticket.save();
  return populateTicket(ticket._id);
};

/**
 * Ajoute une réponse reçue par email
 * @param {string} ticketId - ID du ticket
 * @param {string} emailContent - Contenu de l'email
 * @param {string} senderEmail - Email de l'expéditeur
 * @param {string} senderName - Nom de l'expéditeur
 * @returns {Promise<boolean>} Succès de l'opération
 */
export const addEmailReplyToTicket = async (ticketId, emailContent, senderEmail, senderName = '') => {
  try {
    const ticket = await findTicketOrThrow(ticketId);

    ticket.replies.push({
      content: emailContent.trim(),
      senderEmail,
      senderName,
      isFromAdmin: false,
      createdAt: new Date(),
    });

    await ticket.save();
    console.log(`Réponse email ajoutée au ticket ${ticketId} de ${senderEmail}`);
    return true;
  } catch (error) {
    console.error('Erreur ajout réponse email:', error);
    return false;
  }
};
