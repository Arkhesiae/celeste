const express = require('express');
const router = express.Router();
require('dotenv').config();
const generateTeamUsers = require('../utils/generateTeamUsers');
const { isMasterAdmin, verifyToken } = require('../middleware/authMiddleware');

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

module.exports = router; 