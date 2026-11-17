import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam } from '../middleware/centerAuth.js';
import * as announcementController from '../controllers/announcement.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Nombre de destinataires possibles : administrateurs
router.get('/users-count', isAdmin, announcementController.getUserCount);

// Envoi global (tous les centres) : administrateur principal uniquement
router.post('/send', isMasterAdmin, announcementController.sendAnnouncement);

// Envoi à un centre : son administrateur (ou le master). Le caractère « global » se déduit de la route, pas du corps
router.post('/center/:centerId/send', isAdmin, authorizeCenterParam('centerId'), announcementController.sendAnnouncement);

// Historique, statistiques et suppression : administrateurs
router.get('/history', isAdmin, announcementController.getHistory);
router.get('/stats', isAdmin, announcementController.getStats);
router.delete('/:id', isAdmin, announcementController.deleteAnnouncement);

export default router;
