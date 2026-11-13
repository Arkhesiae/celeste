import express from 'express';
import * as accountRecoveryController from '../controllers/accountRecovery.controller.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

router.get('/legacy-user', accountRecoveryController.fetchLegacyUser);
router.post('/recover', accountRecoveryController.initiateAccountRecovery, userController.createRecoveredUser);

export default router; 