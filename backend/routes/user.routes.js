import express from 'express';
import { verifyToken, isAdmin, isMasterAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeTargetUserCenter, authorizeSelfOrCenterAdmin, resolveCenterId } from '../middleware/centerAuth.js';
import {
  createUser,
  getAllUsers,
  getUserById,
  deleteUserById,
  getPointsById,
  approveUser,
  makeUserAdmin,
  assignUserToCenter,
  getUsersByCenter,
  getUserTeamAtDate,
  getUserCurrentTeam,
  getUsersAndGroupByTeam,
  getTeamsTimeline,
  getUserTeamTimeline,
  getUserTeamOccurrences,
  deleteTeamOccurrence,
  assignTeamToUser,
  deletePendingUser,
  getUserShiftsWithSubstitutions,
  updateUserPreferences,
  getUserPreferences,
  transferPoints,
  getTransactionHistory,
  updateAvatar,
  checkEmailAvailability,
  updateEmail,
  updatePhone,
  updateBirthDate,
  getUserInfoByEmail,
  removeUserAdmin,
  getDevListUsers,
  deletePhone,
} from '../controllers/user.controller.js';
import multer from 'multer';
import fs from 'fs';
import { AVATARS_DIRECTORY } from '../config/paths.js';
import { AVATAR_MAX_BYTES } from '../config/limits.js';
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
router.post('/create', createUser);
router.post('/check-email', checkEmailAvailability);
router.get('/info/:email', getUserInfoByEmail);
router.get('/devlist', getDevListUsers);


router.use(verifyToken);
// Routes pour les équipes (groupées par fonctionnalité)

router.get('/teams/:centerId', authorizeCenterParam('centerId'), getUsersAndGroupByTeam);
router.get('/teams/:centerId/timeline', authorizeCenterParam('centerId'), getTeamsTimeline);
router.get('/:id/team-timeline', authorizeTargetUserCenter('id'), getUserTeamTimeline);
router.get('/center/:centerId', authorizeCenterParam('centerId'), getUsersByCenter);
router.get('/:id/current-team', authorizeTargetUserCenter('id'), getUserCurrentTeam);
router.get('/:id/team-at', isAdmin, authorizeSelfOrCenterAdmin('id'), getUserTeamAtDate);
router.get('/:id/team-occurrences', authorizeSelfOrCenterAdmin('id'), getUserTeamOccurrences);
router.delete('/:id/team-occurrences/:occurrenceId', authorizeSelfOrCenterAdmin('id'), deleteTeamOccurrence);
router.post('/:id/assign-team', authorizeSelfOrCenterAdmin('id'), assignTeamToUser);

// Routes pour les shifts
router.post('/:id/get-shifts-with-substitutions', authorizeSelfOrCenterAdmin('id'), getUserShiftsWithSubstitutions);

// Routes pour les points et transactions
router.get('/:id/points', authorizeSelfOrCenterAdmin('id'), getPointsById);
router.post('/:id/points/transfer', transferPoints);
router.get('/:id/transactions', getTransactionHistory);

// Routes pour les préférences et profil utilisateur
router.get('/:id/preferences', authorizeSelfOrCenterAdmin('id'), getUserPreferences);
router.put('/:id/preferences', authorizeSelfOrCenterAdmin('id'), updateUserPreferences);
router.post('/:id/avatar', authorizeSelfOrCenterAdmin('id'), upload.single('avatar'), updateAvatar);
router.post('/update-email', updateEmail);
router.post('/update-phone', updatePhone);
router.post('/update-birthDate', updateBirthDate);
router.delete('/delete-phone', deletePhone);

// Routes pour la gestion des utilisateurs (admin/master admin)
router.get('/', isAdmin, resolveCenterId, getAllUsers);
router.get('/:id', authorizeSelfOrCenterAdmin('id'), getUserById);
router.post('/pending/:id/approve', isAdmin, authorizeSelfOrCenterAdmin('id'), approveUser);
router.delete('/pending/:id', isAdmin, authorizeSelfOrCenterAdmin('id'), deletePendingUser);
router.post('/:id/make-admin', isMasterAdmin, makeUserAdmin);
router.post('/:id/remove-admin', isMasterAdmin, removeUserAdmin);
router.delete('/:id', isMasterAdmin, deleteUserById);
router.post('/:id/assign-center', isMasterAdmin, assignUserToCenter);

export default router;
