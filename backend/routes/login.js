const express = require('express');
const {User} = require('../models/userModel.js');
const {v4: uuidv4} = require('uuid');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const e = require('express');
const router = express.Router();

// Route de connexion (login)
router.post('/', async (req, res) => {
    const {email, password, stayConnected} = req.body;
    
    // Vérification si l'utilisateur existe
    const user = await User.findOne({email});
    if (!user) {
        return res.status(401).json({error: 'E-mail invalide, aucun utilisateur trouvé'});
    }

    // Vérification du mot de passe
    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
        return res.status(401).json({error: 'Mot de passe invalide'});
    }

    // Génération du token d'accès (JWT)
    const accessToken = jwt.sign({userId: user._id, isAdmin: user.isAdmin}, 'secret', {
        expiresIn: stayConnected ? '365d' : '2h'
    });

    // Réponse avec toutes les informations nécessaires
    res.json({
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        adminType: user.adminType,
        userId: user._id,
        preferences: user.preferences,
        centerId: user.centerId,
        avatar: user.avatar,
        accessToken: accessToken
    });
});

module.exports = router;