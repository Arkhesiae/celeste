import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeBannerAccess, resolveCenterId } from '../middleware/centerAuth.js';
import * as bannerController from '../controllers/banner.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Bannières à afficher : tout utilisateur connecté
router.get('/active', bannerController.getActiveBanners);
router.post('/:id/acknowledge', bannerController.acknowledgeBanner);

// À partir d'ici : administrateurs (local ou principal)
router.use(isAdmin);

// Gestion, cloisonnée par centre
router.get('/', bannerController.getAllBanners);
router.post('/', resolveCenterId, bannerController.createBanner);
router.put('/:id', authorizeBannerAccess, bannerController.updateBanner);
router.delete('/:id', authorizeBannerAccess, bannerController.deleteBanner);

export default router;
