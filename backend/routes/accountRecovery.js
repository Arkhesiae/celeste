import express from 'express';
import accountRecoveryController from '../controllers/accountRecoveryController.js';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', accountRecoveryController.createRequest);
router.get('/', isAdmin, accountRecoveryController.getAllRequests);
router.patch('/:id', isAdmin, accountRecoveryController.updateRequestStatus);

export default router; 