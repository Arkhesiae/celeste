import express from 'express';
const router = express.Router();
import otpController from '../controllers/otpController.js';

router.post('/send', otpController.sendOtp);
router.post('/verify', otpController.verifyOtp);

export default router;    