import express from 'express';
const router = express.Router();
import loginController from '../controllers/loginController.js';

// Route de connexion (login)
router.post('/', loginController.login);

export default router;