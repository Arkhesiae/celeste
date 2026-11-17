import express from 'express';
import * as statController from '../controllers/stat.controller.js';

const router = express.Router();

/**
 * Routes pour les statistiques de l'application (totaux uniquement : utilisateurs, centres, remplacements).
 * Publiques par conception : la page d'accueil (/landing) les affiche avant toute connexion. Elles ne renvoient que
 * des compteurs agrégés, jamais de données individuelles.
 */

// Route pour récupérer toutes les statistiques
router.get('/', statController.getStats);

export default router;
