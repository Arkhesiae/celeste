import { findTicketOrThrow } from './ticket.read.js';

/**
 * Supprime un ticket
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<void>}
 */
export const removeTicket = async (ticketId) => {
  const ticket = await findTicketOrThrow(ticketId);
  await ticket.deleteOne();
};
