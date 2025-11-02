import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { sendTicketReplyEmail } from './email/ticketReplyEmail.js';
import { sendNewTicketNotificationEmail } from './email/newTicketEmail.js';
import { isValidEmail } from '../utils/validation.js';

/**
 * Service pour la gestion des tickets
 * Contient toute la logique métier liée aux tickets
 */

/**
 * Récupère tous les tickets selon les permissions de l'utilisateur
 * @param {Object} user - Utilisateur connecté
 * @param {boolean} archived - Si true, récupère les tickets archivés, sinon les tickets non archivés
 * @returns {Promise<Array>} Liste des tickets
 */
export const getAllTickets = async (userId, archived = false) => {
  let query = { deleted: false };
  
  let user = await User.findById(userId);

  // Si l'utilisateur est master, récupérer les tickets master et local
  if (user.isAdmin && user.adminType === 'master') {
    query.adminType = { $in: ['master', 'local'] };
  } else {
    query.adminType = 'local';
    query.centerId = user.centerId;
  }
  
  return await Ticket.find(query)
    .populate('senderId', 'firstName lastName email')
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
  
  // Trouver l'administrateur approprié
  let admin;
  if (adminType === 'master') {
    admin = await User.findOne({ isAdmin: true, adminType: 'master' });
  } else {
    admin = await User.findOne({ isAdmin: true, adminType: 'local', centerId: centerId });
  }

  if (!admin) {
    throw new Error('Administrateur non trouvé');
  }

  // Trouver l'expéditeur s'il existe
  const sender = await User.findOne({ email: email });
   
  const newTicket = new Ticket({
    title: subject,
    content: message,
    type: type,
    senderEmail: email,
    centerId: centerId,
    adminType: adminType,
    senderId: sender?.id || null
  });

  await newTicket.save();

  // Récupérer le ticket avec les données populées
  const populatedTicket = await Ticket.findById(newTicket._id)
    .populate('senderId', 'firstName lastName email')
    .populate('centerId', 'name OACI');

  // Préparer les données utilisateur pour l'email
  const userData = {
    email: email,
    name: sender?.name || 'Utilisateur',
    lastName: sender?.lastName || ''
  };

  // Récupérer la liste des admins à notifier
  const masterAdmins = await User.find({ isAdmin: true, adminType: 'master' }).select('email');
  const masterEmails = masterAdmins.map(admin => admin.email).filter(email => email);
  
  let adminEmails = masterEmails;
  if (adminType === 'local') {
    const localAdmins = await User.find({ isAdmin: true, adminType: 'local', centerId: centerId }).select('email');
    const localEmails = localAdmins.map(admin => admin.email).filter(email => email);
    adminEmails = [...localEmails, ...masterEmails];
  }

  // Envoyer l'email de notification (ne pas bloquer la création si l'envoi échoue)
  try {
    await sendNewTicketNotificationEmail(
      adminEmails,
      populatedTicket,
      userData,
    );
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de notification de ticket:', error);
    // Ne pas bloquer la création du ticket si l'email échoue
  }

  return populatedTicket;
};

/**
 * Marque un ticket comme lu
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const markTicketAsRead = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  
  if (!ticket) {
    throw new Error('Ticket non trouvé');
  }

  ticket.isRead = true;
  await ticket.save();

  return await Ticket.findById(ticket._id)
    .populate('senderId', 'firstName lastName email')
    .populate('centerId', 'name OACI');
};

/**
 * Supprime un ticket
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<void>}
 */
export const removeTicket = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  
  if (!ticket) {
    throw new Error('Ticket non trouvé');
  }

  await ticket.deleteOne();
};

/**
 * Met à jour le statut d'un ticket
 * @param {string} ticketId - ID du ticket
 * @param {string} status - Nouveau statut
 * @returns {Promise<Object>} Ticket mis à jour
 */
export const updateTicketStatus = async (ticketId, status) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new Error('Ticket non trouvé');
  }

  if (ticket.archived) {
    throw new Error('Vous ne pouvez pas modifier le statut d\'un ticket archivé');
  }

  ticket.status = status;
  await ticket.save();
  
  return await Ticket.findById(ticket._id)
    .populate('senderId', 'firstName lastName email')
    .populate('centerId', 'name OACI');
};

/**
 * Archive un ticket
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const archiveTicket = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  
  if (!ticket) {
    throw new Error('Ticket non trouvé');
  }

  // Vérifier que le ticket est fermé
  if (ticket.status !== 'closed') {
    throw new Error('Seuls les tickets fermés peuvent être archivés');
  }

  ticket.archived = true;
  ticket.archivedAt = new Date();
  await ticket.save();

  return await Ticket.findById(ticket._id)
    .populate('senderId', 'firstName lastName email')
    .populate('centerId', 'name OACI');
};

/**
 * Restaure un ticket archivé
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const restoreTicket = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) {
    throw new Error('Ticket non trouvé');
  }

  ticket.archived = false;
  ticket.archivedAt = null;
  await ticket.save();

  return await Ticket.findById(ticket._id)
    .populate('senderId', 'firstName lastName email')
    .populate('centerId', 'name OACI');
};

/**
 * Marque qu'une réponse a été envoyée
 * @param {string} ticketId - ID du ticket
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const markReplyAsSent = async (ticketId) => {
  const ticket = await Ticket.findById(ticketId);
  
  if (!ticket) {
    throw new Error('Ticket non trouvé');
  }

  ticket.replySent = true;
  await ticket.save();

  return await Ticket.findById(ticket._id)
    .populate('senderId', 'firstName lastName email')
    .populate('centerId', 'name OACI');
};

/**
 * Envoie une réponse à un ticket
 * @param {string} ticketId - ID du ticket
 * @param {string} content - Contenu de la réponse
 * @param {Object} adminUser - Utilisateur admin qui répond
 * @returns {Promise<Object>} Ticket mis à jour avec population
 */
export const sendTicketReply = async (ticketId, content, adminUser) => {
  const ticket = await Ticket.findById(ticketId);
  
  if (!ticket) {
    throw new Error("Ticket non trouvé");
  }

  if (!isValidEmail(ticket.senderEmail)) {
    throw new Error("Email invalide");
  }

  // Récupérer les informations de l'admin qui répond
  const adminName = adminUser.firstName && adminUser.lastName 
    ? `${adminUser.firstName} ${adminUser.lastName}` 
    : 'Support';

  // Envoyer l'email de réponse
  await sendTicketReplyEmail(ticket, content, adminName);

  // Ajouter la réponse au ticket
  const reply = {
    content: content.trim(),
    senderEmail: adminUser.email,
    senderName: adminName,
    isFromAdmin: true,
    createdAt: new Date()
  
  };

  ticket.replies.push(reply);
  ticket.replySent = true;
  await ticket.save();

  return await Ticket.findById(ticket._id)
    .populate('senderId', 'firstName lastName email')
    .populate('centerId', 'name OACI');
};

/**
 * Ajoute une réponse reçue par email (pour le traitement des emails entrants)
 * @param {string} ticketId - ID du ticket
 * @param {string} emailContent - Contenu de l'email
 * @param {string} senderEmail - Email de l'expéditeur
 * @param {string} senderName - Nom de l'expéditeur
 * @returns {Promise<boolean>} Succès de l'opération
 */
export const addEmailReplyToTicket = async (ticketId, emailContent, senderEmail, senderName = '') => {
  try {
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      console.error(`Ticket ${ticketId} non trouvé pour ajouter la réponse email`);
      return false;
    }

    const reply = {
      content: emailContent.trim(),
      senderEmail: senderEmail,
      senderName: senderName,
      isFromAdmin: false,
      createdAt: new Date()
    };

    ticket.replies.push(reply);
    await ticket.save();

    console.log(`Réponse email ajoutée au ticket ${ticketId} de ${senderEmail}`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la réponse email:', error);
    return false;
  }
};
