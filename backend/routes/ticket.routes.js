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

// Toute route de ce fichier qui porte un `:id` désigne un ticket : son centre est contrôlé une fois pour toutes (un master passe),
// après les gardes de rôle déclarées plus bas, juste avant le contrôleur
router.param('id', authorizeTicketAccess);

// À partir d'ici : administrateurs (local ou principal)
router.use(isAdmin);

// Voir les tickets : administrateurs
router.get('/', ticketController.getTickets);

// Modifier un ticket : l'administrateur du centre destinataire (ou le master, voir router.param)
router.post('/status/:id', ticketController.updateTicketStatus);
router.put('/:id/read', ticketController.markAsRead);
router.put('/:id/reply-sent', ticketController.markReplySent);
router.post('/:id/reply', ticketController.sendReply);
router.put('/:id/archive', ticketController.archiveTicket);
router.put('/:id/restore', ticketController.restoreTicket);

// À partir d'ici : administrateur principal uniquement
router.use(isMasterAdmin);

// Supprimer un ticket
router.delete('/:id', ticketController.deleteTicket);

export default router;
