import express from 'express';
const router = express.Router();
import statController from '../controllers/stat.controller.js';


/**
 * Routes pour les statistiques de l'application (totaux uniquement : utilisateurs, centres, remplacements).
 * Publiques par conception : la page d'accueil (/landing) les affiche avant toute connexion. Elles ne renvoient que
 * des compteurs agrégés, jamais de données individuelles.
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
