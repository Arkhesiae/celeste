import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeRotationAccess } from '../middleware/centerAuth.js';
import * as rotationController from '../controllers/rotation.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Toute route de ce fichier qui porte un `:id` désigne un tour de service : son centre est contrôlé une fois pour toutes (un master
// passe), après les gardes de rôle `router.use` et juste avant le contrôleur
router.param('id', authorizeRotationAccess);

// Lecture : les tours de service d'un centre avec leur statut, pour les membres du centre (ou le master)
router.get('/status/:centerId', authorizeCenterParam('centerId'), rotationController.getAllRotationsWithStatus);

// À partir d'ici : administrateurs (local ou principal)
router.use(isAdmin);

// Modification, cloisonnée par centre (authorizeCenterParam ici, router.param pour un tour de service)
router.post('/center/:centerId', authorizeCenterParam('centerId'), rotationController.saveRotation);
router.delete('/:id', rotationController.deleteRotation);

// Aperçu (409 si des demandes sont touchées) ou, avec `confirmed: true` dans le corps, application du changement
router.post('/:id/activate', rotationController.addActivationDate);
router.post('/:id/remove-date', rotationController.removeActivationDate);

router.put('/:id/day', rotationController.updateDayInRotation);
router.post('/:id/duplicate', rotationController.duplicateRotation);
router.put('/:id/update', rotationController.updateRotation);

export default router;
