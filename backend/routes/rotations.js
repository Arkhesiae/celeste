const express = require('express');
const router = express.Router();
const rotationController = require('../controllers/rotationController');
const {verifyToken, isAdmin, isMasterAdmin, checkUserCenter, isUserOrAdmin} = require('../middleware/authMiddleware');


// Routes publiques
router.get('/', verifyToken, rotationController.getAllRotations);
router.get('/center/:centerId', verifyToken, rotationController.getRotationsByCenter);
router.get('/status/:centerId', verifyToken, rotationController.getAllRotationsWithStatus);
router.get('/active-at-date', verifyToken, rotationController.getActiveRotationAtDate);

// Routes protégées par isAdmin
router.post('/save', verifyToken, isAdmin, rotationController.saveRotation);
router.delete('/:id', verifyToken, isAdmin, rotationController.deleteRotation);
router.post('/:id/activate', verifyToken, isAdmin, rotationController.addActivationDate);
router.delete('/:id/activation-date', verifyToken, isAdmin, rotationController.removeActivationDate);

module.exports = router; 