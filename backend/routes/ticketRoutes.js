import express from 'express';
import { getTickets, createTicket, markAsRead, deleteTicket } from '../controllers/ticketController.js';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes pour les tickets
// Seuls les administrateurs peuvent voir tous les tickets
router.get('/', verifyToken, isAdmin, getTickets);

// Création de ticket (accessible à tous les utilisateurs authentifiés)
router.post('/', createTicket);

// Seuls les administrateurs peuvent marquer les tickets comme lus
router.put('/:id/read', verifyToken, isAdmin, markAsRead);

// Seuls les administrateurs principaux peuvent supprimer les tickets
router.delete('/:id', verifyToken, isMasterAdmin, deleteTicket);

export default router; 