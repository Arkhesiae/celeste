import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import * as messageController from '../controllers/message.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Création de message : tout utilisateur connecté
router.post('/', messageController.createMessage);

// À partir d'ici : administrateurs (local ou principal)
router.use(isAdmin);

// Voir tous les messages, les marquer comme lus
router.get('/', messageController.getMessages);
router.put('/:id/read', messageController.markAsRead);

// À partir d'ici : administrateur principal uniquement
router.use(isMasterAdmin);

// Supprimer un message
router.delete('/:id', messageController.deleteMessage);

export default router;
