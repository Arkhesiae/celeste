const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

// Route de connexion (login)
router.post('/', loginController.login);

module.exports = router;