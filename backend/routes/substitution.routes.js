import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeDemandAccess } from '../middleware/centerAuth.js';
import { hasNoPendingCenterTransfer } from '../middleware/userStatus.js';
import * as substitutionController from '../controllers/substitution.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// ── Lecture (les POST de cette section ne modifient rien : le corps porte la période ou les ids demandés) ───────────────

router.post('/center', substitutionController.getCenterRequests);

router.get('/center/:centerId/heatmap', authorizeCenterParam('centerId'), substitutionController.getDemandHeatmap);

router.get('/center/:centerId/all', isAdmin, authorizeCenterParam('centerId'), substitutionController.getAllCenterDemands);

router.get('/user', substitutionController.getUserDemands);

router.post('/:id/consult', authorizeDemandAccess, substitutionController.consultDemand);

router.post('/recategorize', substitutionController.recategorizeSubstitutions);

router.get('/check-shift/:date', substitutionController.checkUserShift);

router.get('/:id/seen-count', authorizeDemandAccess, substitutionController.getSeenCount);

router.post('/detect-team-change-conflicts', substitutionController.detectTeamChangeConflicts);

router.get('/compatibility/:id', authorizeDemandAccess, substitutionController.getCompatibility);

router.get('/compatible-switches/:date', substitutionController.getCompatibleSwitches);

// ── Modification : à partir d'ici, refusée à un utilisateur dont la mutation vers un autre centre est en attente ──
// (l'ordre compte : les lectures sont déclarées avant cette ligne et n'y passent pas)
router.use(hasNoPendingCenterTransfer);

router.post('/', substitutionController.createDemand);

// router.put('/:id/status', substitutionController.updateDemandStatus);

router.post('/:id/interest', authorizeDemandAccess, substitutionController.markInterest);

router.post('/:id/accept', authorizeDemandAccess, substitutionController.acceptDemand);

router.post('/:id/swap', authorizeDemandAccess, substitutionController.swapShifts);

router.post('/:id/cancel', authorizeDemandAccess, substitutionController.cancelDemand);

router.post('/:id/withdraw', authorizeDemandAccess, substitutionController.withdrawFromDemand);

router.delete('/:id/delete', authorizeDemandAccess, substitutionController.deleteDemand);

router.post('/:id/send-email', authorizeDemandAccess, substitutionController.sendAdminEmail);

export default router;
