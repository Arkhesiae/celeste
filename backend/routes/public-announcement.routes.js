import express from 'express';
import {
  getActiveAnnouncements,
  acknowledgeAnnouncement,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/publicAnnouncement.controller.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ── User routes ──────────────────────────────────────────────────────────────

/** GET  /public-announcements/active  — banners for the current user's dashboard */
router.get('/active', verifyToken, getActiveAnnouncements);

/** POST /public-announcements/:id/acknowledge  — dismiss a banner */
router.post('/:id/acknowledge', verifyToken, acknowledgeAnnouncement);

// ── Admin routes ─────────────────────────────────────────────────────────────

/** GET  /public-announcements  — paginated list of all announcements */
router.get('/', verifyToken, isAdmin, getAllAnnouncements);

/** POST /public-announcements  — create a new announcement */
router.post('/', verifyToken, isAdmin, createAnnouncement);

/** PUT  /public-announcements/:id  — update an announcement */
router.put('/:id', verifyToken, isAdmin, updateAnnouncement);

/** DELETE /public-announcements/:id  — delete an announcement */
router.delete('/:id', verifyToken, isAdmin, deleteAnnouncement);

export default router;
