import express from 'express';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam } from '../middleware/centerAuth.js';
import * as centerController from '../controllers/center.controller.js';

const router = express.Router();

// Publique : les formulaires d'inscription, de récupération de compte et de contact doivent proposer la liste des
// centres avant qu'un compte n'existe. Le contrôleur n'en expose que le strict nécessaire (id, nom, OACI, type, zone).
router.get('/', centerController.getAllCenters);

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Carte du tableau de bord : tout utilisateur connecté ; comptes de demandes et position seulement, voir center.map.js
router.get('/map', centerController.getCentersMapData);

// Tour de service actif : membres du centre (ou administrateur principal)
router.get('/:id/active-rotation', authorizeCenterParam('id'), centerController.getActiveRotationOfCenter);

// À partir d'ici : administrateur principal uniquement
router.use(isMasterAdmin);

// Vues et gestion transverses aux centres
router.get('/all-active-rotations', centerController.getActiveRotationsByCenter);
router.get('/users/count', centerController.getUsersCountByCenter);
router.get('/admins', centerController.getAdminsByCenter);
router.post('/', centerController.addCenter);
router.put('/:id', centerController.updateCenter);
router.delete('/:id', centerController.deleteCenter);

export default router;
