import express from 'express';
import { 
  // getTemplates, 
  // getTemplatePreview, 
  getUserCount, 
  sendAnnouncement, 
  getHistory, 
  getStats, 
  deleteAnnouncement 
} from '../controllers/announcement.controller.js';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam } from '../middleware/centerAuth.js';

const router = express.Router();


router.get('/users-count', verifyToken, isAdmin, getUserCount);

// Envoi global (tous les centres) : administrateur principal uniquement
router.post('/send', verifyToken, isMasterAdmin, sendAnnouncement);

// Envoi à un centre : son administrateur (ou le master). Le caractère « global » se déduit de la route, pas du corps
router.post('/center/:centerId/send', verifyToken, isAdmin, authorizeCenterParam('centerId'), sendAnnouncement);

router.get('/history', verifyToken, isAdmin, getHistory);

router.get('/stats', verifyToken, isAdmin, getStats);

router.delete('/:id', verifyToken, isAdmin, deleteAnnouncement);

export default router; 