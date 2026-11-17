import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeRotationAccess } from '../middleware/centerAuth.js';
import * as rotationController from '../controllers/rotation.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Lecture : tout utilisateur connecté
router.get('/', rotationController.getAllRotations);
router.get('/center/:centerId', rotationController.getRotationsByCenter);

router.get('/status/:centerId', rotationController.getAllRotationsWithStatus);

router.get('/active-at-date', rotationController.getActiveRotationAtDate);

// Routes protégées par isAdmin, cloisonnées par centre (authorizeRotation*)
router.post('/center/:centerId', isAdmin, authorizeCenterParam('centerId'), rotationController.saveRotation);

router.delete('/:id', isAdmin, authorizeRotationAccess, rotationController.deleteRotation);

// Aperçu (409 si des demandes sont touchées) ou, avec `confirmed: true` dans le corps, application du changement
router.post('/:id/activate', isAdmin, authorizeRotationAccess, rotationController.addActivationDate);

router.post('/:id/remove-date', isAdmin, authorizeRotationAccess, rotationController.removeActivationDate);

router.put('/:id/day', isAdmin, authorizeRotationAccess, rotationController.updateDayInRotation);

router.post('/:id/duplicate', isAdmin, authorizeRotationAccess, rotationController.duplicateRotation);

router.put('/:id/update', isAdmin, authorizeRotationAccess, rotationController.updateRotation);

export default router;
