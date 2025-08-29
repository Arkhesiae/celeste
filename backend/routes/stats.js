import express from 'express';
const router = express.Router();
import statController from '../controllers/statController.js';


/**
 * Routes pour les statistiques de l'application.
 * Toutes les routes nécessitent une authentification.
 */

// Route pour récupérer toutes les statistiques
router.get('/',  statController.getStats);

// Route pour récupérer le nombre total d'utilisateurs
router.get('/users',  statController.getTotalUsers);

// Route pour récupérer le nombre total de centres
router.get('/centers',  statController.getTotalCenters);

// Route pour récupérer le nombre total de substitutions
router.get('/substitutions',  statController.getTotalSubstitutions);

export default router;
