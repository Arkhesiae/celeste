import express from 'express';
const router = express.Router();
import { verifyToken, isUserOrAdmin, isAdmin } from '../middleware/authMiddleware.js';
import {
    getCenterDemands,
    getUserDemands,
    createDemand,
    deleteDemand,
    updateDemandStatus,
    acceptRequest,
    getSeenCount,
    swapShifts,
    cancelDemand,
    checkUserShift,
    recategorizeSubstitutions,
    markInterest,
    unacceptRequest,
    detectTeamChangeConflicts,
    getCompatibleSwitches,
    getAllCenterDemands,

} from '../controllers/substitutionController.js';

// Routes protégées par token
router.post('/center', verifyToken, getCenterDemands);
router.get('/center/:centerId/all', verifyToken, isAdmin, getAllCenterDemands);
router.get('/user', verifyToken, getUserDemands);
router.post('/', verifyToken, createDemand);
router.put('/:id/status', verifyToken, updateDemandStatus);


router.post('/:id/interest', verifyToken, markInterest);

router.post('/:id/accept', verifyToken, acceptRequest);

router.post('/:id/swap', verifyToken, swapShifts);

router.post('/:id/cancel', verifyToken, cancelDemand);

router.post('/:id/unaccept', verifyToken, unacceptRequest);

router.delete('/:id/delete', verifyToken, deleteDemand);

router.post('/recategorize', verifyToken, recategorizeSubstitutions);

router.get('/check-shift/:date', verifyToken, checkUserShift);

router.get('/:id/seen-count', verifyToken, getSeenCount);

router.post('/detect-team-change-conflicts', verifyToken, detectTeamChangeConflicts);



router.get('/compatible-switches/:date', verifyToken, getCompatibleSwitches);


export default router;
