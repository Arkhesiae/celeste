import express from 'express';
const router = express.Router();
import { verifyToken, isUserOrAdmin } from '../middleware/authMiddleware.js';
import {
    // registerModification,
    getUserEntries,
    deleteModification,
    getModification,
    updateModification,
    restoreInitialShift,
    registerEntry
} from '../controllers/calendarEntry.controller.js';

// Routes pour les utilisateurs
// router.post('/register', verifyToken, registerModification);

router.post('/restore-initial', verifyToken, restoreInitialShift);
router.post('/register-entry', verifyToken, registerEntry);
router.post('/:userId', verifyToken, getUserEntries);
router.get('/:id', verifyToken, getModification);
router.put('/:id', verifyToken, updateModification);
router.delete('/:id', verifyToken, deleteModification);

// Routes pour les admins
// router.get('/center/:centerId', verifyToken, isUserOrAdmin, getCenterModifications);
// router.put('/:id/status', verifyToken, isUserOrAdmin, updateModificationStatus);

export default router;
