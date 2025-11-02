import express from 'express';
import { 
  // getTemplates, 
  // getTemplatePreview, 
  getUserCount, 
  sendAnnouncement, 
  getHistory, 
  getStats, 
  deleteAnnouncement 
} from '../controllers/announcementController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();


router.get('/users-count', verifyToken, isAdmin, getUserCount);

router.post('/send', verifyToken, isAdmin, sendAnnouncement);

router.get('/history', verifyToken, isAdmin, getHistory);

router.get('/stats', verifyToken, isAdmin, getStats);

router.delete('/:id', verifyToken, isAdmin, deleteAnnouncement);

export default router; 