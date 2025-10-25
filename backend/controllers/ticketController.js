import * as ticketService from '../services/ticketService.js';

// Récupérer tous les tickets
const getTickets = async (req, res) => {
  try {
    // Validation de l'utilisateur
    if (!req.user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const tickets = await ticketService.getAllTickets(req.user);
    res.json(tickets);
  } catch (error) {
    console.error('Erreur lors de la récupération des tickets:', error);
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

// Créer un nouveau ticket
const createTicket = async (req, res) => {
  try {
    const { adminType, type, subject, email, message, centerId } = req.body;
    
    // Validation des données requises
    if (!adminType || !type || !subject || !email || !message || !centerId) {
      return res.status(400).json({ 
        message: 'Tous les champs sont requis: adminType, type, subject, email, message, centerId' 
      });
    }

    // Validation du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format d\'email invalide' });
    }

    // Validation des types autorisés
    const validAdminTypes = ['master', 'local'];
    if (!validAdminTypes.includes(adminType)) {
      return res.status(400).json({ message: 'Type d\'admin invalide' });
    }

    const ticketData = { adminType, type, subject, email, message, centerId };
    const newTicket = await ticketService.createNewTicket(ticketData);
    
    res.status(201).json(newTicket);
  } catch (error) {
    console.error('Erreur lors de la création du ticket:', error);
    
    if (error.message === 'Administrateur non trouvé') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

// Marquer un ticket comme lu
const markAsRead = async (req, res) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      return res.status(400).json({ message: 'ID du ticket requis' });
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    const updatedTicket = await ticketService.markTicketAsRead(req.params.id);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors du marquage du ticket comme lu:', error);
    
    if (error.message === 'Ticket non trouvé') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

// Supprimer un ticket
const deleteTicket = async (req, res) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      return res.status(400).json({ message: 'ID du ticket requis' });
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    await ticketService.removeTicket(req.params.id);
    res.json({ message: 'Ticket supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du ticket:', error);
    
    if (error.message === 'Ticket non trouvé') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

// Mettre à jour le statut d'un ticket
const updateTicketStatus = async (req, res) => {
  try {
    const { ticketStatus } = req.body;
    
    // Validation de l'ID du ticket
    if (!req.params.id) {
      return res.status(400).json({ message: 'ID du ticket requis' });
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    // Validation du statut
    if (!ticketStatus) {
      return res.status(400).json({ message: 'Statut du ticket requis' });
    }

    const validStatuses = ['new', 'in_progress', 'done', 'closed'];
    if (!validStatuses.includes(ticketStatus)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const updatedTicket = await ticketService.updateTicketStatus(req.params.id, ticketStatus);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut du ticket:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut du ticket' });
  }
};

// Marquer qu'une réponse a été envoyée
const markReplySent = async (req, res) => {
  try {
    // Validation de l'ID du ticket
    if (!req.params.id) {
      return res.status(400).json({ message: 'ID du ticket requis' });
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(req.params.id)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    const updatedTicket = await ticketService.markReplyAsSent(req.params.id);
    res.json(updatedTicket);
  } catch (error) {
    console.error('Erreur lors du marquage de la réponse envoyée:', error);
    
    if (error.message === 'Ticket non trouvé') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erreur du serveur' });
  }
};

// Envoyer une réponse à un ticket
const sendReply = async (req, res) => {
  try {
    const { content } = req.body;
    const ticketId = req.params.id;
    
    // Validation de l'ID du ticket
    if (!ticketId) {
      return res.status(400).json({ message: 'ID du ticket requis' });
    }

    // Validation du format de l'ID MongoDB
    const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!mongoIdRegex.test(ticketId)) {
      return res.status(400).json({ message: 'Format d\'ID invalide' });
    }

    // Validation du contenu de la réponse
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Le contenu de la réponse est requis' });
    }

    // Validation de l'utilisateur admin
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: 'Accès refusé - Administrateur requis' });
    }

    const updatedTicket = await ticketService.sendTicketReply(ticketId, content, req.user);
    res.json(updatedTicket);
  } catch (error) {
    if (error.message === 'Ticket non trouvé') {
      return res.status(404).json({ message: error.message });
    }

    else if (error.message === 'Email invalide') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erreur du serveur' });
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

export {
  getTickets,
  createTicket,
  markAsRead,
  deleteTicket,
  updateTicketStatus,
  markReplySent,
  sendReply,
  addEmailReply
}; 