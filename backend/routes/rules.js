const express = require('express');
const router = express.Router();
const ruleController = require('../controllers/ruleController');
const { verifyToken, isMasterAdmin } = require('../middleware/authMiddleware');



// Récupérer toutes les règles
router.get('/', ruleController.getAllRules);

// Toutes les routes nécessitent une authentification
router.use(verifyToken);

// Routes protégées pour les administrateurs maîtres uniquement
router.post('/initialize', isMasterAdmin, ruleController.initializeRules);
router.put('/:name', isMasterAdmin, ruleController.updateRule);

module.exports = router; 