import express from 'express';
const router = express.Router();
import { verifyToken, isUserOrAdmin } from '../middleware/authMiddleware.js';
import {
    createModification,
    getUserModifications,
    getCenterModifications,
    updateModificationStatus,
    deleteModification,
    getModification,
    updateModification
} from '../controllers/planningModificationController.js';

// Routes pour les utilisateurs
router.post('/', verifyToken, createModification);
router.get('/user', verifyToken, getUserModifications);
router.get('/:id', verifyToken, getModification);
router.put('/:id', verifyToken, updateModification);
router.delete('/:id', verifyToken, deleteModification);

// Routes pour les admins
router.get('/center/:centerId', verifyToken, isUserOrAdmin, getCenterModifications);
router.put('/:id/status', verifyToken, isUserOrAdmin, updateModificationStatus);

export default router;
