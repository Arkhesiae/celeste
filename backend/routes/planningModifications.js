import express from 'express';
const router = express.Router();
import { verifyToken, isUserOrAdmin } from '../middleware/authMiddleware.js';
import {
    registerModification,
    getUserModifications,
    // getCenterModifications,
    // updateModificationStatus,
    deleteModification,
    getModification,
    updateModification
} from '../controllers/planningModificationController.js';

// Routes pour les utilisateurs
router.post('/register', verifyToken, registerModification);
router.get('/user/:userId', verifyToken, getUserModifications);
router.get('/:id', verifyToken, getModification);
router.put('/:id', verifyToken, updateModification);
router.delete('/:id', verifyToken, deleteModification);

// Routes pour les admins
// router.get('/center/:centerId', verifyToken, isUserOrAdmin, getCenterModifications);
// router.put('/:id/status', verifyToken, isUserOrAdmin, updateModificationStatus);

export default router;
