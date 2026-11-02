import express from 'express';
import rotationController from '../controllers/rotation.controller.js';
import {verifyToken, isAdmin, isMasterAdmin, checkUserCenter, isUserOrAdmin} from '../middleware/authMiddleware.js';

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

// Routes protégées par isAdmin
router.post('/create', verifyToken, isAdmin, rotationController.saveRotation);

router.delete('/:id', verifyToken, isAdmin, rotationController.deleteRotation);

router.post('/:id/activate', verifyToken, isAdmin, rotationController.addActivationDate);

router.post('/:id/confirm-activate', verifyToken, isAdmin, asConfirmed(rotationController.addActivationDate));

router.post('/:id/remove-date', verifyToken, isAdmin, rotationController.removeActivationDate);

router.post('/:id/confirm-remove-activate', verifyToken, isAdmin, asConfirmed(rotationController.removeActivationDate));

router.put('/:id/day', verifyToken, isAdmin, rotationController.updateDayInRotation);

router.post('/:id/duplicate', verifyToken, isAdmin, rotationController.duplicateRotation);

router.put('/:id/update', verifyToken, isAdmin, rotationController.updateRotation);


export default router; 
