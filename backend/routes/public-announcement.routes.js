import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeAnnouncementAccess, resolveCenterId } from '../middleware/centerAuth.js';
import * as publicAnnouncementController from '../controllers/publicAnnouncement.controller.js';

const router = express.Router();

// ── User routes ──────────────────────────────────────────────────────────────

router.get('/active', verifyToken, publicAnnouncementController.getActiveAnnouncements);

router.post('/:id/acknowledge', verifyToken, publicAnnouncementController.acknowledgeAnnouncement);

router.get('/', verifyToken, isAdmin, publicAnnouncementController.getAllAnnouncements);
router.post('/', verifyToken, isAdmin, resolveCenterId, publicAnnouncementController.createAnnouncement);
router.put('/:id', verifyToken, isAdmin, authorizeAnnouncementAccess, publicAnnouncementController.updateAnnouncement);
router.delete('/:id', verifyToken, isAdmin, authorizeAnnouncementAccess, publicAnnouncementController.deleteAnnouncement);

export default router;
