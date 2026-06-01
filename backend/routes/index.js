import express from 'express';
import usersRouter from './user.routes.js';
import rotationsRouter from './rotations.routes.js';
import centerRouter from './center.routes.js';
import teamsRouter from './teams.routes.js';
import substitutionRouter from './substitution.routes.js';
import messageRoutes from './message.routes.js';
import ticketRoutes from './ticket.routes.js';
import otpRoutes from './otp.routes.js';
import authRouter from './auth.routes.js';
import devRouter from './dev.routes.js';
import rulesRouter from './rules.routes.js';
import accountRecoveryRouter from './account-recovery.routes.js';
import announcementRoutes from './announcement.routes.js';
import calendarEntryRouter from './calendar-entry.routes.js';
import statsRouter from './stats.routes.js';
import publicAnnouncementRouter from './public-announcement.routes.js';

const router = express.Router();

// Monter tous les routeurs
router.use('/users', usersRouter);
router.use('/messages', messageRoutes);
router.use('/tickets', ticketRoutes);
router.use('/auth', authRouter);
router.use('/substitution', substitutionRouter);
router.use('/rotations', rotationsRouter);
router.use('/center', centerRouter);
router.use('/teams', teamsRouter);
router.use('/otp', otpRoutes);
router.use('/dev', devRouter);
router.use('/rules', rulesRouter);
router.use('/account-recovery', accountRecoveryRouter);
router.use('/announcements', announcementRoutes);
router.use('/planning-modifications', calendarEntryRouter);
router.use('/stats', statsRouter);
router.use('/public-announcements', publicAnnouncementRouter);

export default router;
