import express from 'express';
import userRouter from './user.routes.js';
import rotationRouter from './rotation.routes.js';
import centerRouter from './center.routes.js';
import teamRouter from './team.routes.js';
import substitutionRouter from './substitution.routes.js';
import messageRouter from './message.routes.js';
import ticketRouter from './ticket.routes.js';
import otpRouter from './otp.routes.js';
import authRouter from './auth.routes.js';
import devRouter from './dev.routes.js';
import ruleRouter from './rule.routes.js';
import accountRecoveryRouter from './accountRecovery.routes.js';
import announcementRouter from './announcement.routes.js';
import calendarEntryRouter from './calendarEntry.routes.js';
import statRouter from './stat.routes.js';
import publicAnnouncementRouter from './publicAnnouncement.routes.js';

const router = express.Router();

// Monter tous les routeurs
router.use('/user', userRouter);
router.use('/message', messageRouter);
router.use('/ticket', ticketRouter);
router.use('/auth', authRouter);
router.use('/substitution', substitutionRouter);
router.use('/rotation', rotationRouter);
router.use('/center', centerRouter);
router.use('/team', teamRouter);
router.use('/otp', otpRouter);
router.use('/dev', devRouter);
router.use('/rule', ruleRouter);
router.use('/account-recovery', accountRecoveryRouter);
router.use('/announcement', announcementRouter);
router.use('/calendar-entry', calendarEntryRouter);
router.use('/stat', statRouter);
router.use('/public-announcement', publicAnnouncementRouter);

export default router;
