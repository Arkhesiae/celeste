import express from 'express';
import dotenv from 'dotenv';
import generateTeamUsers from '../utils/generateTeamUsers.js';
import { isMasterAdmin, verifyToken } from '../middleware/authMiddleware.js';

dotenv.config();

const router = express.Router();

// Route pour générer les utilisateurs des équipes (uniquement en dev)
router.post('/populate-users', verifyToken, isMasterAdmin, async (req, res) => {
    console.log(process.env.NODE_ENV);
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ 
            success: false, 
            message: 'Cette route n\'est disponible qu\'en mode développement' 
        });
    }

    const result = await generateTeamUsers();
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

export default router; 