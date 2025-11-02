import express from 'express';
import { getTickets, createTicket, markAsRead, deleteTicket, updateTicketStatus, markReplySent, sendReply, archiveTicket, restoreTicket } from '../controllers/ticketController.js';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { handleInboundEmail } from '../services/emailIncomingService.js';

const router = express.Router();

 



// Création de ticket (accessible à tous les utilisateurs authentifiés)
router.post('/create', createTicket);

// Mettre à jour le statut d'un ticket
router.post('/status/:id',  updateTicketStatus);

// Seuls les administrateurs peuvent marquer les tickets comme lus
router.put('/:id/read', verifyToken, isAdmin, markAsRead);

// Seuls les administrateurs principaux peuvent supprimer les tickets
router.delete('/:id', verifyToken, isMasterAdmin, deleteTicket);

// Seuls les administrateurs peuvent voir tous les tickets
router.get('/', verifyToken, isAdmin, getTickets);

// Marquer qu'une réponse a été envoyée
router.put('/:id/reply-sent', verifyToken, isAdmin, markReplySent);

// Envoyer une réponse à un ticket
router.post('/:id/reply', verifyToken, isAdmin, sendReply);

// Archiver un ticket
router.put('/:id/archive', verifyToken, isAdmin, archiveTicket);

// Restaurer un ticket archivé
router.put('/:id/restore', verifyToken, isAdmin, restoreTicket);

// Recevoir un email entrant
router.post('/inbound', express.text({ type: "*/*" }), handleInboundEmail);

export default router; 