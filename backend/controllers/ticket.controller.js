import * as ticketService from '../services/ticket/ticket.service.js';

import { AppError } from '../error/AppError.js';
// Récupérer tous les tickets
const getTickets = async (req, res, next) => {
  try {
    // Validation de l'utilisateur
    if (!req.user) {
      throw new AppError('Utilisateur non authentifié', 401);
    }

    const archived = req.query.archived === 'true';
    const tickets = await ticketService.getAllTickets(req.user.userId, archived);
    res.json(tickets);
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets:', error);
    next(error);
  }
};

// Créer un nouveau ticket
const createTicket = async (req, res, next) => {
  try {
    const { adminType, type, subject, email, message, centerId } = req.body;
    
    // Validation des données requises
    if (!adminType || !type || !subject || !email || !message) {
      throw new AppError('Tous les champs sont requis: adminType, type, subject, email, message, centerId', 400);
    }

    if (adminType === 'local' && !centerId) {
      throw new AppError('Le centre est requis pour un administrateur local', 400);
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Format d\'email invalide', 400);
    }

    // Validation des types autorisés
    const validAdminTypes = ['master', 'local'];
    if (!validAdminTypes.includes(adminType)) {
      throw new AppError('Type d\'admin invalide', 400);
    }

    const ticketData = { adminType, type, subject, email, message, centerId };
    const newTicket = await ticketService.createNewTicket(ticketData);
    
    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Erreur lors de la création du ticket:', error);
    
    next(error);
  }
};

// Marquer un ticket comme lu
const markAsRead = async (req, res, next) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      throw new AppError('ID du ticket requis', 400);
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      throw new AppError('Format d\'ID invalide', 400);
    }

    const updatedTicket = await ticketService.markTicketAsRead(req.params.id);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors du marquage du ticket comme lu:', error);
    
    next(error);
  }
};

// Supprimer un ticket
const deleteTicket = async (req, res, next) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      throw new AppError('ID du ticket requis', 400);
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      throw new AppError('Format d\'ID invalide', 400);
    }

    await ticketService.removeTicket(req.params.id);
    res.json({ message: 'Ticket supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du ticket:', error);
    
    next(error);
  }
};

// Mettre à jour le statut d'un ticket
const updateTicketStatus = async (req, res, next) => {
  try {
    const { ticketStatus } = req.body;
    
    // Validation de l'ID du ticket
    if (!req.params.id) {
      throw new AppError('ID du ticket requis', 400);
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      throw new AppError('Format d\'ID invalide', 400);
    }

    // Validation du statut
    if (!ticketStatus) {
      throw new AppError('Statut du ticket requis', 400);
    }

    const validStatuses = ['new', 'in_progress', 'done', 'closed'];
    if (!validStatuses.includes(ticketStatus)) {
      throw new AppError('Statut invalide', 400);
    }

    const updatedTicket = await ticketService.updateTicketStatus(req.params.id, ticketStatus);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut du ticket:', error);
    next(error);
  }
};

// Marquer qu'une réponse a été envoyée
const markReplySent = async (req, res, next) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      throw new AppError('ID du ticket requis', 400);
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      throw new AppError('Format d\'ID invalide', 400);
    }

    const updatedTicket = await ticketService.markReplyAsSent(req.params.id);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors du marquage de la réponse envoyée:', error);
    
    next(error);
  }
};

// Envoyer une réponse à un ticket
const sendReply = async (req, res, next) => {
  try {
    const { content } = req.body;
    const ticketId = req.params.id;
    
    // Validation de l'ID du ticket
    if (!ticketId) {
      throw new AppError('ID du ticket requis', 400);
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(ticketId)) {
      throw new AppError('Format d\'ID invalide', 400);
    }

    // Validation du contenu de la réponse
    if (!content || content.trim().length === 0) {
      throw new AppError('Le contenu de la réponse est requis', 400);
    }

    // Validation de l'utilisateur admin
    if (!req.user || !req.user.isAdmin) {
      throw new AppError('Accès refusé - Administrateur requis', 403);
    }

    const updatedTicket = await ticketService.sendTicketReply(ticketId, content, req.user);
    res.json(updatedTicket);
  } catch (error) {
    next(error);
  }
};

// Ajouter une réponse reçue par email (pour le traitement des emails entrants)
const addEmailReply = async (ticketId, emailContent, senderEmail, senderName = '') => {
  try {
    // Validation des paramètres
    if (!ticketId || !emailContent || !senderEmail) {
      console.error('Paramètres manquants pour addEmailReply');
      return false;
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(ticketId)) {
      console.error('Format d\'ID invalide pour addEmailReply');
      return false;
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      console.error('Format d\'email invalide pour addEmailReply');
      return false;
    }

    return await ticketService.addEmailReplyToTicket(ticketId, emailContent, senderEmail, senderName);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la réponse email:', error);
    return false;
  }
};

// Archiver un ticket
const archiveTicket = async (req, res, next) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      throw new AppError('ID du ticket requis', 400);
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      throw new AppError('Format d\'ID invalide', 400);
    }

    const updatedTicket = await ticketService.archiveTicket(req.params.id);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors de l\'archivage du ticket:', error);
    
    next(error);
  }
};

// Restaurer un ticket archivé
const restoreTicket = async (req, res, next) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      throw new AppError('ID du ticket requis', 400);
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      throw new AppError('Format d\'ID invalide', 400);
    }

    const updatedTicket = await ticketService.restoreTicket(req.params.id);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors de la restauration du ticket:', error);
    next(error);
  }
};

export {
  getTickets,
  createTicket,
  markAsRead,
  deleteTicket,
  updateTicketStatus,
  markReplySent,
  sendReply,
  addEmailReply,
  archiveTicket,
  restoreTicket
}; 