const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verifyToken, isAdmin, isMasterAdmin } = require('../middleware/authMiddleware');



// Routes pour les messages
// Seuls les administrateurs peuvent voir tous les messages
router.get('/', verifyToken, isAdmin, messageController.getMessages);

// Création de message (accessible à tous les utilisateurs authentifiés)
router.post('/', messageController.createMessage);

// Seuls les administrateurs peuvent marquer les messages comme lus
router.put('/:id/read', verifyToken, isAdmin, messageController.markAsRead);

// Seuls les administrateurs principaux peuvent supprimer les messages
router.delete('/:id', verifyToken, isMasterAdmin, messageController.deleteMessage);

module.exports = router; 