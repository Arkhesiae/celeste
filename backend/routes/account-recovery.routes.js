import express from 'express';

import { fetchLegacyUser, initiateAccountRecovery } from '../controllers/accountRecovery.controller.js';
import { createRecoveredUser } from '../controllers/user.controller.js';

const router = express.Router();


router.get('/legacy-user', fetchLegacyUser);
router.post('/recover', initiateAccountRecovery, createRecoveredUser);

export default router; 