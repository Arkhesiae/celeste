import express from 'express';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam } from '../middleware/centerAuth.js';
import * as centerController from '../controllers/center.controller.js';

const router = express.Router();

// Publique : les formulaires d'inscription, de récupération de compte et de contact doivent proposer la liste des
// centres avant qu'un compte n'existe. Le contrôleur n'en expose que le strict nécessaire (id, nom, OACI, type, zone).
router.get('/', centerController.getAllCenters);

// Tout le reste exige un utilisateur connecté
router.use(verifyToken);

// Carte du tableau de bord : tout utilisateur connecté ; comptes de demandes et position seulement, voir center.map.js
router.get('/map', centerController.getCentersMapData);

// Vues et gestion transverses aux centres : administrateur principal uniquement
router.get('/all-active-rotations', isMasterAdmin, centerController.getActiveRotationsByCenter);
router.get('/users/count', isMasterAdmin, centerController.getUsersCountByCenter);
router.get('/admins', isMasterAdmin, centerController.getAdminsByCenter);
router.post('/', isMasterAdmin, centerController.addCenter);
router.put('/:id', isMasterAdmin, centerController.updateCenter);
router.delete('/:id', isMasterAdmin, centerController.deleteCenter);

// Tour de service actif : membres du centre (ou administrateur principal)
router.get('/:id/active-rotation', authorizeCenterParam('id'), centerController.getActiveRotationOfCenter);

export default router;
