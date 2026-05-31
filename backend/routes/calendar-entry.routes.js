import express from 'express';
const router = express.Router();
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    getUserEntries,
    getModification,
    restoreInitialShift,
    registerEntry,
    undoMods,
    remove
} from '../controllers/calendarEntry.controller.js';

// Routes pour les utilisateurs
router.post('/restore-initial', verifyToken, restoreInitialShift);
router.post('/register-entry', verifyToken, registerEntry);
router.post('/undo-mods', verifyToken, undoMods);
router.post('/delete-assignment', verifyToken, remove);
router.post('/:userId', verifyToken, getUserEntries);
router.get('/:id', verifyToken, getModification);


export default router;
