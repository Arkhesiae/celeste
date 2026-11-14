import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { AVATARS_DIRECTORY } from '../config/paths.js';
import { AVATAR_MAX_BYTES } from '../config/limits.js';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeTargetUserCenter, authorizeSelfOrCenterAdmin, resolveCenterId } from '../middleware/centerAuth.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Dossier non suivi par git : multer ne le crée pas quand la destination est une fonction
    fs.mkdirSync(AVATARS_DIRECTORY, { recursive: true });
    cb(null, AVATARS_DIRECTORY)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + ".png")
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: AVATAR_MAX_BYTES
  }
})


// Routes publiques (aucune authentification requise) : inscription et connexion en ont besoin avant qu'un compte existe
router.post('/create', userController.createUser);
router.post('/check-email', userController.checkEmailAvailability);
router.get('/info/:email', userController.getUserInfoByEmail);
router.get('/devlist', userController.getDevListUsers);


router.use(verifyToken);
// Routes pour les équipes (groupées par fonctionnalité)

router.get('/teams/:centerId', authorizeCenterParam('centerId'), userController.getUsersAndGroupByTeam);
router.get('/teams/:centerId/timeline', authorizeCenterParam('centerId'), userController.getTeamsTimeline);
router.get('/:id/team-timeline', authorizeTargetUserCenter('id'), userController.getUserTeamTimeline);
router.get('/center/:centerId', authorizeCenterParam('centerId'), userController.getUsersByCenter);
router.get('/:id/current-team', authorizeTargetUserCenter('id'), userController.getUserCurrentTeam);
router.get('/:id/team-at', isAdmin, authorizeSelfOrCenterAdmin('id'), userController.getUserTeamAtDate);
router.get('/:id/team-occurrences', authorizeSelfOrCenterAdmin('id'), userController.getUserTeamOccurrences);
router.delete('/:id/team-occurrences/:occurrenceId', authorizeSelfOrCenterAdmin('id'), userController.deleteTeamOccurrence);
router.post('/:id/assign-team', authorizeSelfOrCenterAdmin('id'), userController.assignTeamToUser);

// Routes pour les shifts
router.post('/:id/get-shifts-with-substitutions', authorizeSelfOrCenterAdmin('id'), userController.getUserShiftsWithSubstitutions);

// Routes pour les points et transactions
router.get('/:id/points', authorizeSelfOrCenterAdmin('id'), userController.getPointsById);
router.get('/:id/work-check', authorizeSelfOrCenterAdmin('id'), userController.getUserWorkCheck);
router.post('/:id/points/transfer', userController.transferPoints);
router.get('/:id/transactions', userController.getTransactionHistory);

// Routes pour les préférences et profil utilisateur
router.get('/:id/preferences', authorizeSelfOrCenterAdmin('id'), userController.getUserPreferences);
router.put('/:id/preferences', authorizeSelfOrCenterAdmin('id'), userController.updateUserPreferences);
router.post('/:id/avatar', authorizeSelfOrCenterAdmin('id'), upload.single('avatar'), userController.updateAvatar);
router.post('/update-email', userController.updateEmail);
router.post('/update-phone', userController.updatePhone);
router.post('/update-birthDate', userController.updateBirthDate);
router.delete('/delete-phone', userController.deletePhone);

// Routes pour la gestion des utilisateurs (admin/master admin)
router.get('/', isAdmin, resolveCenterId, userController.getAllUsers);
router.get('/:id', authorizeSelfOrCenterAdmin('id'), userController.getUserById);
router.post('/pending/:id/approve', isAdmin, authorizeSelfOrCenterAdmin('id'), userController.approveUser);
router.delete('/pending/:id', isAdmin, authorizeSelfOrCenterAdmin('id'), userController.deletePendingUser);
router.post('/:id/make-admin', isMasterAdmin, userController.makeUserAdmin);
router.post('/:id/remove-admin', isMasterAdmin, userController.removeUserAdmin);
router.delete('/:id', isMasterAdmin, userController.deleteUserById);
router.post('/:id/assign-center', isMasterAdmin, userController.assignUserToCenter);

export default router;
