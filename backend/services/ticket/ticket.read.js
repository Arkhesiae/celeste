import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import { findOrThrow } from '../../utils/mongo.js';

/** Charge un ticket ou lève une 404 */
export const findTicketOrThrow = (ticketId) => findOrThrow(Ticket, ticketId, { message: 'Ticket non trouvé' });

/** Un ticket avec son expéditeur et son centre (nom, e-mail, OACI) */
export const populateTicket = (ticketId) =>
  Ticket.findById(ticketId)
    .populate('senderId', 'name lastName email')
    .populate('centerId', 'name OACI');

/**
 * Récupère tous les tickets selon les permissions de l'utilisateur
 * @param {string} userId - ID de l'utilisateur connecté
 * @param {boolean} archived - Si true, récupère les tickets archivés
 * @returns {Promise<Array>} Liste des tickets
 */
export const getAllTickets = async (userId, archived = false) => {
  const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
  let query = { deleted: false, archived };

  if (user.isAdmin && user.adminType === 'master') {
    query.adminType = { $in: ['master', 'local'] };
  } else {
    query.adminType = 'local';
    query.centerId = user.centerId;
  }

  return Ticket.find(query)
    .populate('senderId', 'name lastName email')
    .populate('centerId', 'name OACI')
    .sort({ createdAt: -1 });
};
