import Ticket from '../../models/Ticket.js';
import User from '../../models/User.js';
import { AppError } from '../../error/AppError.js';
import { sendNewTicketNotificationEmail } from '../email/email.newTicket.js';
import { populateTicket } from './ticket.read.js';

const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL;

/**
 * Crée un nouveau ticket
 * @param {Object} ticketData - Données du ticket
 * @returns {Promise<Object>} Ticket créé avec population
 */
export const createNewTicket = async (ticketData) => {
  const { adminType, type, subject, email, message, centerId } = ticketData;

  const masterAdmin = await User.findOne({ isAdmin: true, adminType: 'master' });
  if (!masterAdmin) throw new AppError('Aucun admin master trouvé', 404);

  let localAdmins = [];
  if (adminType === 'local') {
    localAdmins = await User.find({ isAdmin: true, adminType: 'local', centerId }).select('email');
    if (!localAdmins.length) throw new AppError('Aucun admin local trouvé pour ce centre', 404);
  }

  const sender = await User.findOne({ email });

  const newTicket = await Ticket.create({
    title: subject,
    content: message,
    type,
    senderEmail: email,
    centerId,
    adminType,
    senderId: sender?._id || null,
  });

  const populatedTicket = await populateTicket(newTicket._id);

  const userData = {
    email,
    name: sender?.name || 'Utilisateur',
    lastName: sender?.lastName || '',
  };

  let adminEmails = [MASTER_ADMIN_EMAIL];
  if (adminType === 'local') {
    const localEmails = localAdmins.map(a => a.email).filter(e => e);
    adminEmails = [...localEmails, ...adminEmails];
  }

  try {
    await sendNewTicketNotificationEmail(adminEmails, populatedTicket, userData);
  } catch (error) {
    console.error('Erreur envoi email notification ticket:', error);
  }

  return populatedTicket;
};
