import express from 'express';
const router = express.Router();
import ruleController from '../controllers/ruleController.js';
import { verifyToken, isMasterAdmin } from '../middleware/authMiddleware.js';



// Récupérer toutes les règles
router.get('/', ruleController.getAllRules);

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Routes protégées pour les administrateurs maîtres uniquement
router.post('/initialize', isMasterAdmin, ruleController.initializeRules);
router.post('/reset', isMasterAdmin, ruleController.resetRules);
router.put('/:name', isMasterAdmin, ruleController.updateRule);

export default router; 