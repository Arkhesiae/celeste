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

// À partir d'ici : administrateurs (local ou principal)
router.use(isAdmin);

// Gestion, cloisonnée par centre
router.get('/', publicAnnouncementController.getAllAnnouncements);
router.post('/', resolveCenterId, publicAnnouncementController.createAnnouncement);
router.put('/:id', authorizeAnnouncementAccess, publicAnnouncementController.updateAnnouncement);
router.delete('/:id', authorizeAnnouncementAccess, publicAnnouncementController.deleteAnnouncement);

export default router;
