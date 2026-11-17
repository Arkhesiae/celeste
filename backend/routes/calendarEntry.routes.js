import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { hasNoPendingCenterTransfer } from '../middleware/userStatus.js';
import * as calendarEntryController from '../controllers/calendarEntry.controller.js';

const router = express.Router();

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// ── Lecture ──────────────────────────────────────────────────────────────────────────────────────────────────────────

// Modifications d'un jour : ?date=AAAA-MM-JJ
router.get('/:userId', calendarEntryController.getUserEntries);

// ── Modification : à partir d'ici, refusée à un utilisateur dont la mutation vers un autre centre est en attente ──
// (l'ordre compte : les lectures sont déclarées avant cette ligne et n'y passent pas)
router.use(hasNoPendingCenterTransfer);

router.post('/register-entry', calendarEntryController.registerEntry);
router.post('/undo-mods', calendarEntryController.undoMods);
router.post('/delete-assignment', calendarEntryController.remove);

export default router;
