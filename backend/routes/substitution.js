import express from 'express';
const router = express.Router();
import { verifyToken, isUserOrAdmin, isAdmin } from '../middleware/authMiddleware.js';
import * as substitutionController from '../controllers/substitutionController.js';

// Routes protégées par token
router.post('/center', verifyToken, substitutionController.getCenterDemands);

router.get('/center/:centerId/all', verifyToken, isAdmin, substitutionController.getAllCenterDemands);

router.get('/user', verifyToken, substitutionController.getUserDemands);

router.post('/', verifyToken, substitutionController.createDemand);

// router.put('/:id/status', verifyToken, substitutionController.updateDemandStatus);


router.post('/:id/consult', verifyToken, substitutionController.consultDemand);

router.post('/:id/interest', verifyToken, substitutionController.markInterest);

router.post('/:id/accept', verifyToken, substitutionController.acceptDemand);

router.post('/:id/swap', verifyToken, substitutionController.swapShifts);

router.post('/:id/cancel', verifyToken, substitutionController.cancelDemand);

router.post('/:id/withdraw', verifyToken, substitutionController.withdrawFromDemand);

router.delete('/:id/delete', verifyToken, substitutionController.deleteDemand);

router.post('/recategorize', verifyToken, substitutionController.recategorizeSubstitutions);

router.get('/check-shift/:date', verifyToken, substitutionController.checkUserShift);

router.get('/:id/seen-count', verifyToken, substitutionController.getSeenCount);

router.post('/detect-team-change-conflicts', verifyToken, substitutionController.detectTeamChangeConflicts);

router.get('/compatibility/:id', verifyToken, substitutionController.getCompatibility);

router.get('/compatible-switches/:date', verifyToken, substitutionController.getCompatibleSwitches);


export default router;
