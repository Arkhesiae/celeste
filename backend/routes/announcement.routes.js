import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam } from '../middleware/centerAuth.js';
import * as announcementController from '../controllers/announcement.controller.js';

const router = express.Router();

router.get('/users-count', verifyToken, isAdmin, announcementController.getUserCount);

// Envoi global (tous les centres) : administrateur principal uniquement
router.post('/send', verifyToken, isMasterAdmin, announcementController.sendAnnouncement);

// Envoi à un centre : son administrateur (ou le master). Le caractère « global » se déduit de la route, pas du corps
router.post('/center/:centerId/send', verifyToken, isAdmin, authorizeCenterParam('centerId'), announcementController.sendAnnouncement);

router.get('/history', verifyToken, isAdmin, announcementController.getHistory);

router.get('/stats', verifyToken, isAdmin, announcementController.getStats);

router.delete('/:id', verifyToken, isAdmin, announcementController.deleteAnnouncement);

export default router; 