import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeAnnouncementAccess, resolveCenterId } from '../middleware/centerAuth.js';
import * as publicAnnouncementController from '../controllers/publicAnnouncement.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Annonces à afficher : tout utilisateur connecté
router.get('/active', publicAnnouncementController.getActiveAnnouncements);

router.post('/:id/acknowledge', publicAnnouncementController.acknowledgeAnnouncement);

// Gestion : administrateurs, cloisonnée par centre
router.get('/', isAdmin, publicAnnouncementController.getAllAnnouncements);
router.post('/', isAdmin, resolveCenterId, publicAnnouncementController.createAnnouncement);
router.put('/:id', isAdmin, authorizeAnnouncementAccess, publicAnnouncementController.updateAnnouncement);
router.delete('/:id', isAdmin, authorizeAnnouncementAccess, publicAnnouncementController.deleteAnnouncement);

export default router;
