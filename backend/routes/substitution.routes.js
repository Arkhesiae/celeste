import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeDemandAccess } from '../middleware/centerAuth.js';
import { hasNoPendingCenterTransfer } from '../middleware/userStatus.js';
import * as substitutionController from '../controllers/substitution.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Toute route de ce fichier qui porte un `:id` désigne une demande : son centre est contrôlé une fois pour toutes, après les
// `router.use` déclarés plus bas (gardes de rôle, mutation en attente) et juste avant le contrôleur
router.param('id', authorizeDemandAccess);

// ── Lecture ──────────────────────────────────────────────────────────────────────────────────────────────────────────

// Demandes d'une période. POST bien que ce soit une lecture    : elle marque les demandes comme vues (effet de bord)
router.post('/center', substitutionController.getCenterRequests);

router.get('/center/:centerId/heatmap', authorizeCenterParam('centerId'), substitutionController.getDemandHeatmap);
router.get('/center/:centerId/all', isAdmin, authorizeCenterParam('centerId'), substitutionController.getAllCenterDemands);

// Demandes de l'utilisateur et vérifications sur son planning
router.get('/user', substitutionController.getUserDemands);
router.get('/check-shift/:date', substitutionController.checkUserShift);
router.get('/compatible-switches/:date', substitutionController.getCompatibleSwitches);

// Changement d'équipe : ?userId=&newTeamId=&fromDate=
router.get('/detect-team-change-conflicts', substitutionController.detectTeamChangeConflicts);

// POST bien que ce soit une lecture : le corps porte une liste d'ids, trop longue pour une URL
router.post('/recategorize', substitutionController.recategorizeSubstitutions);

// Une demande (:id, voir router.param)
router.get('/compatibility/:id', substitutionController.getCompatibility);
router.get('/:id/seen-count', substitutionController.getSeenCount);
// POST : marque la demande comme vue (effet de bord)
router.post('/:id/consult', substitutionController.consultDemand);

// ── Modification : à partir d'ici, refusée à un utilisateur dont la mutation vers un autre centre est en attente ──
// (l'ordre compte : les lectures sont déclarées avant cette ligne et n'y passent pas)
router.use(hasNoPendingCenterTransfer);

router.post('/', substitutionController.createDemand);

router.post('/:id/interest', substitutionController.markInterest);
router.post('/:id/accept', substitutionController.acceptDemand);
router.post('/:id/swap', substitutionController.swapShifts);
router.post('/:id/cancel', substitutionController.cancelDemand);
router.post('/:id/withdraw', substitutionController.withdrawFromDemand);
router.delete('/:id/delete', substitutionController.deleteDemand);
router.post('/:id/send-email', substitutionController.sendAdminEmail);

export default router;
