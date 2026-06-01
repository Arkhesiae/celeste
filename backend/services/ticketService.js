import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { sendTicketReplyEmail } from './email/ticketReplyEmail.js';
import { sendNewTicketNotificationEmail } from './email/newTicketEmail.js';
import { isValidEmail } from '../utils/validation.js';
import { AppError } from '../error/appError.js';

const MASTER_ADMIN_EMAIL = process.env.MASTER_ADMIN_EMAIL;

// --- Helpers ---

const findTicketOrThrow = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) throw new AppError('Ticket non trouvé', 404);
  return ticket;
};

const populateTicket = (ticketId) =>
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
  const user = await User.findById(userId);
  if (!user) throw new AppError('Utilisateur non trouvé', 404);

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
 * Supprime un ticket
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<void>}
 */
export const removeTicket = async (ticketId) => {
  const ticket = await findTicketOrThrow(ticketId);
  await ticket.deleteOne();
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
    ? `${adminUser.name} ${adminUser.lastName}`
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