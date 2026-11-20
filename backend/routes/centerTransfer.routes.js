import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import * as centerTransferController from '../controllers/centerTransfer.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Ma demande : pas de `hasNoPendingCenterTransfer` ici, l'utilisateur doit pouvoir l'annuler tant qu'elle est en attente
router.get('/mine', centerTransferController.getMine);
router.get('/preview', centerTransferController.preview);
router.post('/', centerTransferController.request);
router.delete('/', centerTransferController.cancel);

// À partir d'ici : administrateurs (local ou principal) ; le service vérifie que l'acceptation se fait dans le centre d'arrivée
router.use(isAdmin);

router.get('/', centerTransferController.list);
router.post('/:userId/accept', centerTransferController.accept);

export default router;
