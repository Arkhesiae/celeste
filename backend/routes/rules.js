import express from 'express';
const router = express.Router();
import ruleController from '../controllers/ruleController.js';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';

// Récupérer toutes les règles (Public or Protected? Leaving as is based on existing file, but note it is before verifyToken)
// Actually, usually we might want this protected. But to preserve existing behavior if any, I'll leave it here 
// OR move it if I think it's a bug. Given the "verifyToken" use below, it implies lines above are public.
router.get('/', ruleController.getAllRules);

// Toutes les routes ci-dessous nécessitent une authentification
router.use(verifyToken);

// Routes protégées pour les administrateurs maîtres uniquement (Init/Reset)
router.post('/initialize', isMasterAdmin, ruleController.initializeRules);
router.post('/reset', isMasterAdmin, ruleController.resetRules);

// Lock/Unlock rule (Master Admin only)
router.put('/:name/lock', isMasterAdmin, ruleController.toggleLock);

// Update rule (Center Admin accessible, permission logic in service/controller + lock check)
// Previously restricted to isMasterAdmin, now opened up for center overrides.
router.put('/:name', ruleController.updateRule);
router.delete('/:name', ruleController.deleteRuleOverride);

export default router;