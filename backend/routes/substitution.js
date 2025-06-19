import express from 'express';
const router = express.Router();
import { verifyToken, isUserOrAdmin } from '../middleware/authMiddleware.js';
import {
    getCenterDemands,
    getUserDemands,
    createDemand,
    deleteDemand,
    updateDemandStatus,
    markRequestAsSeen,
    acceptRequest,
    getSeenCount,
    swapShifts,
    cancelDemand,
    checkUserShift,
    markInterest,
    unacceptRequest,
    detectTeamChangeConflicts
} from '../controllers/substitutionController.js';

// Routes protégées par token
router.get('/center', verifyToken, getCenterDemands);
router.get('/user', verifyToken, getUserDemands);
router.post('/', verifyToken, createDemand);
router.put('/:id/status', verifyToken, updateDemandStatus);
router.post('/:id/seen', verifyToken, markRequestAsSeen);

router.post('/:id/interest', verifyToken, markInterest);

router.post('/:id/accept', verifyToken, acceptRequest);
router.post('/:id/swap', verifyToken, swapShifts);
router.post('/:id/cancel', verifyToken, cancelDemand);
router.post('/:id/unaccept', verifyToken, unacceptRequest);
router.delete('/:id/delete', verifyToken, deleteDemand);

router.get('/check-shift/:date', verifyToken, checkUserShift);

router.get('/:id/seen-count', verifyToken, getSeenCount);

router.post('/detect-team-change-conflicts', verifyToken, detectTeamChangeConflicts);

export default router;
