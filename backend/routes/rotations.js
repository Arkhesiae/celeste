import express from 'express';
import rotationController from '../controllers/rotationController.js';
import {verifyToken, isAdmin, isMasterAdmin, checkUserCenter, isUserOrAdmin} from '../middleware/authMiddleware.js';

const router = express.Router();

// Routes publiques
router.get('/', verifyToken, rotationController.getAllRotations);
router.get('/center/:centerId', verifyToken, rotationController.getRotationsByCenter);

router.get('/status/:centerId', verifyToken, rotationController.getAllRotationsWithStatus);

router.get('/active-at-date', verifyToken, rotationController.getActiveRotationAtDate);

// Routes protégées par isAdmin
router.post('/create', verifyToken, isAdmin, rotationController.saveRotation);

router.delete('/:id', verifyToken, isAdmin, rotationController.deleteRotation);

router.post('/:id/activate', verifyToken, isAdmin, rotationController.addActivationDate);

router.post('/:id/confirm-activate', verifyToken, isAdmin, rotationController.confirmAddActivationDate);

router.post('/:id/remove-date', verifyToken, isAdmin, rotationController.removeActivationDate);

router.post('/:id/confirm-remove-activate', verifyToken, isAdmin, rotationController.confirmRemoveActivationDate);

router.put('/:id/day', verifyToken, isAdmin, rotationController.updateDayInRotation);

router.post('/:id/duplicate', verifyToken, isAdmin, rotationController.duplicateRotation);

router.put('/:id/update', verifyToken, isAdmin, rotationController.updateRotation);


export default router; 
