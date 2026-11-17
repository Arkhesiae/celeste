import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam } from '../middleware/centerAuth.js';
import * as announcementController from '../controllers/announcement.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);
// À partir d'ici : administrateurs (local ou principal)
router.use(isAdmin);

// Nombre de destinataires possibles : administrateurs
router.get('/users-count', announcementController.getUserCount);

// Envoi global (tous les centres) : administrateur principal uniquement
router.post('/send', isMasterAdmin, announcementController.sendAnnouncement);

// Envoi à un centre : son administrateur (ou le master). Le caractère « global » se déduit de la route, pas du corps
router.post('/center/:centerId/send', authorizeCenterParam('centerId'), announcementController.sendAnnouncement);

// Historique et statistiques : administrateurs
router.get('/history', announcementController.getHistory);
router.get('/stats', announcementController.getStats);

export default router;
