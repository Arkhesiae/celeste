import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import * as messageController from '../controllers/message.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Seuls les administrateurs peuvent voir tous les messages
router.get('/', isAdmin, messageController.getMessages);

// Création de message (accessible à tous les utilisateurs authentifiés)
router.post('/', messageController.createMessage);

// Seuls les administrateurs peuvent marquer les messages comme lus
router.put('/:id/read', isAdmin, messageController.markAsRead);

// Seuls les administrateurs principaux peuvent supprimer les messages
router.delete('/:id', isMasterAdmin, messageController.deleteMessage);

export default router;
