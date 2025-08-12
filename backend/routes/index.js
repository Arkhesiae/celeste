import express from 'express';
import usersRouter from './users.js';
import rotationsRouter from './rotations.js';
import centerRouter from './center.js';
import teamsRouter from './teams.js';
import substitutionRouter from './substitution.js';
import loginRouter from './login.js';
import notificationRouter from './notifications.js';
import messageRoutes from './messageRoutes.js';
import ticketRoutes from './ticketRoutes.js';
import otpRoutes from './otpRoutes.js';
import authRouter from './auth.js';
import devRouter from './dev.js';
import rulesRouter from './rules.js';
import accountRecoveryRouter from './accountRecovery.js';
import announcementRoutes from './announcementRoutes.js';
import planningModificationsRouter from './planningModifications.js';
import statsRouter from './stats.js';

const router = express.Router();

// Monter tous les routeurs
router.use('/users', usersRouter);
router.use('/messages', messageRoutes);
router.use('/tickets', ticketRoutes);
router.use('/login', loginRouter);
router.use('/auth', authRouter);
router.use('/substitution', substitutionRouter);
router.use('/rotations', rotationsRouter);
router.use('/notifications', notificationRouter);
router.use('/center', centerRouter);
router.use('/teams', teamsRouter);
router.use('/otp', otpRoutes);
router.use('/dev', devRouter);
router.use('/rules', rulesRouter);
router.use('/account-recovery', accountRecoveryRouter);
router.use('/announcements', announcementRoutes);
router.use('/planning-modifications', planningModificationsRouter);
router.use('/stats', statsRouter);

export default router;
