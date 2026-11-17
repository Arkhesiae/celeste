import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { hasNoPendingCenterTransfer } from '../middleware/userStatus.js';
import * as calendarEntryController from '../controllers/calendarEntry.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// Modification du planning : refusée à un utilisateur dont la mutation vers un autre centre est en attente. La garde est posée
// route par route (et non par un `router.use`) parce que ces chemins fixes doivent être déclarés avant `/:userId`, qui les
// intercepterait, et que la lecture `/:userId` ne doit pas être refusée.
router.post('/restore-initial', hasNoPendingCenterTransfer, calendarEntryController.restoreInitialShift);
router.post('/register-entry', hasNoPendingCenterTransfer, calendarEntryController.registerEntry);
router.post('/undo-mods', hasNoPendingCenterTransfer, calendarEntryController.undoMods);
router.post('/delete-assignment', hasNoPendingCenterTransfer, calendarEntryController.remove);

// Lecture (POST, mais ne modifie rien)
router.post('/:userId', calendarEntryController.getUserEntries);

export default router;
