import express from 'express';
import {
  getActiveAnnouncements,
  acknowledgeAnnouncement,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/publicAnnouncement.controller.js';
import { verifyToken, isAdmin, resolveCenterId } from '../middleware/authMiddleware.js';
import { authorizeAnnouncementAccess } from '../middleware/announcementAuth.js';

const router = express.Router();

// ── User routes ──────────────────────────────────────────────────────────────

router.get('/active', verifyToken, getActiveAnnouncements);

router.post('/:id/acknowledge', verifyToken, acknowledgeAnnouncement);

router.get('/', verifyToken, isAdmin, getAllAnnouncements);
router.post('/', verifyToken, isAdmin, resolveCenterId, createAnnouncement);
router.put('/:id', verifyToken, isAdmin, authorizeAnnouncementAccess, updateAnnouncement);
router.delete('/:id', verifyToken, isAdmin, authorizeAnnouncementAccess, deleteAnnouncement);

export default router;
