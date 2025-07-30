import express from 'express';
import {verifyToken, isAdmin, isMasterAdmin, checkUserCenter, isUserOrAdmin} from '../middleware/authMiddleware.js';
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
    getUserTeamOccurrences,
    deleteTeamOccurrence,
    assignTeamToUser,
    getUserShifts,
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
  } from '../controllers/userController.js';
import multer from 'multer';
const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'public/avatars/')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix+".png")
    }
  })
  
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})


// Routes publiques (aucune authentification requise)
router.post('/create', createUser);
router.post('/check-email', checkEmailAvailability);
router.get('/info/:email', getUserInfoByEmail);
router.get('/devlist', getDevListUsers);


router.use(verifyToken);
// Routes pour les équipes (groupées par fonctionnalité)

router.get('/teams/:centerId', getUsersAndGroupByTeam);
router.get('/center/:centerId', getUsersByCenter);
router.get('/:id/current-team', getUserCurrentTeam);
router.get('/:id/team-at', isAdmin, checkUserCenter, getUserTeamAtDate);
router.get('/:id/team-occurrences', isUserOrAdmin, getUserTeamOccurrences);
router.delete('/:id/team-occurrences/:occurrenceId', isUserOrAdmin, deleteTeamOccurrence);
router.post('/:id/assign-team', isUserOrAdmin, assignTeamToUser);

// Routes pour les shifts
router.post('/:id/get-shifts', isUserOrAdmin, getUserShifts);
router.post('/:id/get-shifts-with-substitutions', isUserOrAdmin, getUserShiftsWithSubstitutions);

// Routes pour les points et transactions
router.get('/:id/points', isUserOrAdmin, getPointsById);
router.post('/:id/points/transfer', transferPoints);
router.get('/:id/transactions', getTransactionHistory);

// Routes pour les préférences et profil utilisateur
router.get('/:id/preferences', isUserOrAdmin, getUserPreferences);
router.put('/:id/preferences', isUserOrAdmin, updateUserPreferences);
router.post('/:id/avatar', upload.single('avatar'), updateAvatar);
router.post('/update-email', updateEmail);
router.post('/update-phone', updatePhone);
router.post('/update-birthDate', updateBirthDate);
router.delete('/delete-phone', deletePhone);

// Routes pour la gestion des utilisateurs (admin/master admin)
router.get('/',  getAllUsers);
router.get('/:id', isUserOrAdmin, getUserById); 
router.post('/pending/:id/approve', isAdmin, approveUser);
router.delete('/pending/:id', isAdmin, deletePendingUser);
router.post('/:id/make-admin', isMasterAdmin, makeUserAdmin);
router.post('/:id/remove-admin', isMasterAdmin, removeUserAdmin);
router.delete('/:id', isMasterAdmin, deleteUserById);
router.post('/:id/assign-center', isMasterAdmin, assignUserToCenter);

export default router;
