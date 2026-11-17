import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeTicketAccess } from '../middleware/centerAuth.js';
import { handleInboundEmail } from '../services/email/index.js';
import * as ticketController from '../controllers/ticket.controller.js';

const router = express.Router();

// Création de ticket : publique par conception. Le formulaire /contact-admin sert aussi aux personnes qui ne peuvent
// pas (ou plus) se connecter ; il est donc ouvert sans jeton (à protéger par une limite de débit, voir le suivi).
router.post('/create', ticketController.createTicket);

// Recevoir un email entrant
router.post('/inbound', express.text({ type: "*/*" }), handleInboundEmail);

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Mettre à jour le statut d'un ticket : administrateur du centre destinataire (ou master)
router.post('/status/:id', isAdmin, authorizeTicketAccess, ticketController.updateTicketStatus);

// Seuls les administrateurs peuvent marquer les tickets comme lus
router.put('/:id/read', isAdmin, authorizeTicketAccess, ticketController.markAsRead);

// Seuls les administrateurs principaux peuvent supprimer les tickets
router.delete('/:id', isMasterAdmin, ticketController.deleteTicket);

// Seuls les administrateurs peuvent voir tous les tickets
router.get('/', isAdmin, ticketController.getTickets);

// Marquer qu'une réponse a été envoyée
router.put('/:id/reply-sent', isAdmin, authorizeTicketAccess, ticketController.markReplySent);

// Envoyer une réponse à un ticket
router.post('/:id/reply', isAdmin, authorizeTicketAccess, ticketController.sendReply);

// Archiver un ticket
router.put('/:id/archive', isAdmin, authorizeTicketAccess, ticketController.archiveTicket);

// Restaurer un ticket archivé
router.put('/:id/restore', isAdmin, authorizeTicketAccess, ticketController.restoreTicket);

export default router;
