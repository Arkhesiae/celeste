import express from 'express';

import { fetchLegacyUser, initiateAccountRecovery } from '../controllers/recoveryController.js';
import { createUser } from '../controllers/userController.js';

const router = express.Router();


router.get('/legacy-user', fetchLegacyUser);
router.post('/recover', initiateAccountRecovery, createUser);

export default router; 