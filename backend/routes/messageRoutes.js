const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');


// Routes pour les messages
router.get('/', messageController.getMessages);
router.post('/', messageController.createMessage);
router.put('/:id/read', messageController.markAsRead);
router.delete('/:id', messageController.deleteMessage);

module.exports = router; 