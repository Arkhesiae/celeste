import express from 'express';
const router = express.Router();
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeDemandAccess } from '../middleware/centerAuth.js';
import * as substitutionController from '../controllers/substitution.controller.js';

// Routes protégées par token
router.post('/center', verifyToken, substitutionController.getCenterRequests);

router.get('/center/:centerId/all', verifyToken, isAdmin, authorizeCenterParam('centerId'), substitutionController.getAllCenterDemands);

router.get('/user', verifyToken, substitutionController.getUserDemands);

router.post('/', verifyToken, substitutionController.createDemand);

// router.put('/:id/status', verifyToken, substitutionController.updateDemandStatus);


router.post('/:id/consult', verifyToken, authorizeDemandAccess, substitutionController.consultDemand);

router.post('/:id/interest', verifyToken, authorizeDemandAccess, substitutionController.markInterest);

router.post('/:id/accept', verifyToken, authorizeDemandAccess, substitutionController.acceptDemand);

router.post('/:id/swap', verifyToken, authorizeDemandAccess, substitutionController.swapShifts);

router.post('/:id/cancel', verifyToken, authorizeDemandAccess, substitutionController.cancelDemand);

router.post('/:id/withdraw', verifyToken, authorizeDemandAccess, substitutionController.withdrawFromDemand);

router.delete('/:id/delete', verifyToken, authorizeDemandAccess, substitutionController.deleteDemand);

router.post('/:id/send-email', verifyToken, authorizeDemandAccess, substitutionController.sendAdminEmail);

router.post('/recategorize', verifyToken, substitutionController.recategorizeSubstitutions);

router.get('/check-shift/:date', verifyToken, substitutionController.checkUserShift);

router.get('/:id/seen-count', verifyToken, authorizeDemandAccess, substitutionController.getSeenCount);

router.post('/detect-team-change-conflicts', verifyToken, substitutionController.detectTeamChangeConflicts);

router.get('/compatibility/:id', verifyToken, authorizeDemandAccess, substitutionController.getCompatibility);

router.get('/compatible-switches/:date', verifyToken, substitutionController.getCompatibleSwitches);


export default router;
