import express from 'express';
import * as otpController from '../controllers/otp.controller.js';

const router = express.Router();

router.post('/send', otpController.sendOtp);
router.post('/verify', otpController.verifyOtp);

export default router;    