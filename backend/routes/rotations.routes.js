import express from 'express';
import rotationController from '../controllers/rotation.controller.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeRotationAccess } from '../middleware/centerAuth.js';

const router = express.Router();

// Routes publiques
router.get('/', verifyToken, rotationController.getAllRotations);
router.get('/center/:centerId', verifyToken, rotationController.getRotationsByCenter);

router.get('/status/:centerId', verifyToken, rotationController.getAllRotationsWithStatus);

router.get('/active-at-date', verifyToken, rotationController.getActiveRotationAtDate);

// Routes protégées par isAdmin, cloisonnées par centre (authorizeRotation*)
router.post('/center/:centerId', verifyToken, isAdmin, authorizeCenterParam('centerId'), rotationController.saveRotation);

router.delete('/:id', verifyToken, isAdmin, authorizeRotationAccess, rotationController.deleteRotation);

// Aperçu (409 si des demandes sont touchées) ou, avec `confirmed: true` dans le corps, application du changement
router.post('/:id/activate', verifyToken, isAdmin, authorizeRotationAccess, rotationController.addActivationDate);

router.post('/:id/remove-date', verifyToken, isAdmin, authorizeRotationAccess, rotationController.removeActivationDate);

router.put('/:id/day', verifyToken, isAdmin, authorizeRotationAccess, rotationController.updateDayInRotation);

router.post('/:id/duplicate', verifyToken, isAdmin, authorizeRotationAccess, rotationController.duplicateRotation);

router.put('/:id/update', verifyToken, isAdmin, authorizeRotationAccess, rotationController.updateRotation);

export default router; 
