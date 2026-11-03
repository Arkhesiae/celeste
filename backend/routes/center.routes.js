import express from 'express';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam } from '../middleware/centerAuth.js';

const router = express.Router();

import {
    getAllCenters,
    addCenter,
    updateCenter,
    deleteCenter,
    getActiveRotationOfCenter,

    getActiveRotationsByCenter,
    getUsersCountByCenter,
    getAdminsByCenter
} from '../controllers/center.controller.js';

// Publique : les formulaires d'inscription, de récupération de compte et de contact doivent proposer la liste des
// centres avant qu'un compte n'existe. Le contrôleur n'en expose que le strict nécessaire (id, nom, OACI, type, zone).
router.get('/', getAllCenters);

// Tout le reste exige un utilisateur connecté
router.use(verifyToken);

// Vues et gestion transverses aux centres : administrateur principal uniquement
router.get('/all-active-rotations', isMasterAdmin, getActiveRotationsByCenter);
router.get('/users/count', isMasterAdmin, getUsersCountByCenter);
router.get('/admins', isMasterAdmin, getAdminsByCenter);
router.post('/', isMasterAdmin, addCenter);
router.put('/:id', isMasterAdmin, updateCenter);
router.delete('/:id', isMasterAdmin, deleteCenter);

// Tour de service actif : membres du centre (ou administrateur principal)
router.get('/:id/active-rotation', authorizeCenterParam('id'), getActiveRotationOfCenter);

export default router;
