import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeTicketAccess } from '../middleware/centerAuth.js';
import * as ticketController from '../controllers/ticket.controller.js';
import { handleInboundEmail } from '../services/email/index.js';

const router = express.Router();

// Création de ticket : publique par conception. Le formulaire /contact-admin sert aussi aux personnes qui ne peuvent
// pas (ou plus) se connecter ; il est donc ouvert sans jeton (à protéger par une limite de débit, voir le suivi).
router.post('/create', ticketController.createTicket);

// Mettre à jour le statut d'un ticket : administrateur du centre destinataire (ou master)
router.post('/status/:id', verifyToken, isAdmin, authorizeTicketAccess, ticketController.updateTicketStatus);

// Seuls les administrateurs peuvent marquer les tickets comme lus
router.put('/:id/read', verifyToken, isAdmin, authorizeTicketAccess, ticketController.markAsRead);

// Seuls les administrateurs principaux peuvent supprimer les tickets
router.delete('/:id', verifyToken, isMasterAdmin, ticketController.deleteTicket);

// Seuls les administrateurs peuvent voir tous les tickets
router.get('/', verifyToken, isAdmin, ticketController.getTickets);

// Marquer qu'une réponse a été envoyée
router.put('/:id/reply-sent', verifyToken, isAdmin, authorizeTicketAccess, ticketController.markReplySent);

// Envoyer une réponse à un ticket
router.post('/:id/reply', verifyToken, isAdmin, authorizeTicketAccess, ticketController.sendReply);

// Archiver un ticket
router.put('/:id/archive', verifyToken, isAdmin, authorizeTicketAccess, ticketController.archiveTicket);

// Restaurer un ticket archivé
router.put('/:id/restore', verifyToken, isAdmin, authorizeTicketAccess, ticketController.restoreTicket);

// Recevoir un email entrant
router.post('/inbound', express.text({ type: "*/*" }), handleInboundEmail);

export default router; 