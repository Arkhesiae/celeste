import express from 'express';
import { 
  getTemplates, 
  getTemplatePreview, 
  getUserCount, 
  sendAnnouncement, 
  getHistory, 
  getStats, 
  deleteAnnouncement 
} from '../controllers/announcementController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/announcements/templates
 * Récupère la liste des templates d'emails disponibles
 */
router.get('/templates', verifyToken, isAdmin, getTemplates);

/**
 * POST /api/announcements/templates/:templateType/preview
 * Génère un aperçu HTML d'un template avec les données fournies
 */
router.post('/templates/:templateType/preview', verifyToken, isAdmin, getTemplatePreview);

/**
 * GET /api/announcements/users-count
 * Récupère le nombre total d'utilisateurs pour l'envoi en masse
 */
router.get('/users-count', verifyToken, isAdmin, getUserCount);

/**
 * POST /api/announcements/send
 * Envoie un email d'annonce en masse à tous les utilisateurs
 */
router.post('/send', verifyToken, isAdmin, sendAnnouncement);

/**
 * GET /api/announcements/history
 * Récupère l'historique des annonces envoyées
 */
router.get('/history', verifyToken, isAdmin, getHistory);

/**
 * GET /api/announcements/stats
 * Récupère les statistiques des annonces
 */
router.get('/stats', verifyToken, isAdmin, getStats);

/**
 * DELETE /api/announcements/:id
 * Supprime une annonce de l'historique
 */
router.delete('/:id', verifyToken, isAdmin, deleteAnnouncement);

export default router; 