import express from 'express';
import messageController from '../controllers/messageController.js';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes pour les messages
// Seuls les administrateurs peuvent voir tous les messages
router.get('/', verifyToken, isAdmin, messageController.getMessages);

// Création de message (accessible à tous les utilisateurs authentifiés)
router.post('/', messageController.createMessage);

// Seuls les administrateurs peuvent marquer les messages comme lus
router.put('/:id/read', verifyToken, isAdmin, messageController.markAsRead);

// Seuls les administrateurs principaux peuvent supprimer les messages
router.delete('/:id', verifyToken, isMasterAdmin, messageController.deleteMessage);

export default router; 