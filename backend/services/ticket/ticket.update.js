import { AppError } from '../../error/AppError.js';
import { findTicketOrThrow, populateTicket } from './ticket.read.js';

/**
 * Marque un ticket comme lu
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const markTicketAsRead = async (ticketId) => {
  const ticket = await findTicketOrThrow(ticketId);
  ticket.isRead = true;
  await ticket.save();
  return populateTicket(ticket._id);
};

/**
 * Met à jour le statut d'un ticket
 * @param {string} ticketId - ID du ticket
 * @param {string} status - Nouveau statut
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const updateTicketStatus = async (ticketId, status) => {
  const ticket = await findTicketOrThrow(ticketId);
  if (ticket.archived) throw new AppError('Impossible de modifier le statut d\'un ticket archivé', 400);
  ticket.status = status;
  await ticket.save();
  return populateTicket(ticket._id);
};

/**
 * Archive un ticket
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const archiveTicket = async (ticketId) => {
  const ticket = await findTicketOrThrow(ticketId);
  if (ticket.status !== 'closed') throw new AppError('Seuls les tickets fermés peuvent être archivés', 400);
  ticket.archived = true;
  ticket.archivedAt = new Date();
  await ticket.save();
  return populateTicket(ticket._id);
};

/**
 * Restaure un ticket archivé
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const restoreTicket = async (ticketId) => {
  const ticket = await findTicketOrThrow(ticketId);
  ticket.archived = false;
  ticket.archivedAt = null;
  await ticket.save();
  return populateTicket(ticket._id);
};

/**
 * Marque qu'une réponse a été envoyée
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const markReplyAsSent = async (ticketId) => {
  const ticket = await findTicketOrThrow(ticketId);
  ticket.replySent = true;
  await ticket.save();
  return populateTicket(ticket._id);
};
