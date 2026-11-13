import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import * as calendarEntryController from '../controllers/calendarEntry.controller.js';

const router = express.Router();

// Routes pour les utilisateurs
router.post('/restore-initial', verifyToken, calendarEntryController.restoreInitialShift);
router.post('/register-entry', verifyToken, calendarEntryController.registerEntry);
router.post('/undo-mods', verifyToken, calendarEntryController.undoMods);
router.post('/delete-assignment', verifyToken, calendarEntryController.remove);
router.post('/:userId', verifyToken, calendarEntryController.getUserEntries);
router.get('/:id', verifyToken, calendarEntryController.getModification);


export default router;
