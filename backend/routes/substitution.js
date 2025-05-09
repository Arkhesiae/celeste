const express = require('express');
const router = express.Router();
const {verifyToken, isUserOrAdmin} = require('../middleware/authMiddleware');
const {
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
    markInterest
} = require('../controllers/substitutionController');

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
router.delete('/:id/delete', verifyToken, deleteDemand);

router.get('/check-shift/:date', verifyToken, checkUserShift);

router.get('/:id/seen-count', verifyToken, getSeenCount);

module.exports = router;
