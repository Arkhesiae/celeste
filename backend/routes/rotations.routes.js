import express from 'express';
import rotationController from '../controllers/rotation.controller.js';
import {verifyToken, isAdmin, isMasterAdmin, checkUserCenter, isUserOrAdmin} from '../middleware/authMiddleware.js';
import { authorizeRotationAccess, authorizeRotationCreation } from '../middleware/rotationAuth.js';

const router = express.Router();

// Les anciens endpoints /confirm-* sont conservés pour le front : ils réutilisent
// les handlers fusionnés add/removeActivationDate avec `confirmed: true`.
const asConfirmed = (handler) => (req, res, next) => {
  req.body = { ...req.body, confirmed: true };
  return handler(req, res, next);
};

// Routes publiques
router.get('/', verifyToken, rotationController.getAllRotations);
router.get('/center/:centerId', verifyToken, rotationController.getRotationsByCenter);

router.get('/status/:centerId', verifyToken, rotationController.getAllRotationsWithStatus);

router.get('/active-at-date', verifyToken, rotationController.getActiveRotationAtDate);

// Routes protégées par isAdmin, cloisonnées par centre (authorizeRotation*)
router.post('/create', verifyToken, isAdmin, authorizeRotationCreation, rotationController.saveRotation);

router.delete('/:id', verifyToken, isAdmin, authorizeRotationAccess, rotationController.deleteRotation);

router.post('/:id/activate', verifyToken, isAdmin, authorizeRotationAccess, rotationController.addActivationDate);

router.post('/:id/confirm-activate', verifyToken, isAdmin, authorizeRotationAccess, asConfirmed(rotationController.addActivationDate));

router.post('/:id/remove-date', verifyToken, isAdmin, authorizeRotationAccess, rotationController.removeActivationDate);

router.post('/:id/confirm-remove-activate', verifyToken, isAdmin, authorizeRotationAccess, asConfirmed(rotationController.removeActivationDate));

router.put('/:id/day', verifyToken, isAdmin, authorizeRotationAccess, rotationController.updateDayInRotation);

router.post('/:id/duplicate', verifyToken, isAdmin, authorizeRotationAccess, rotationController.duplicateRotation);

router.put('/:id/update', verifyToken, isAdmin, authorizeRotationAccess, rotationController.updateRotation);


export default router; 
