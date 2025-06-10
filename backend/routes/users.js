const express = require('express');
const {verifyToken, isAdmin, isMasterAdmin, checkUserCenter, isUserOrAdmin} = require('../middleware/authMiddleware');
const {
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
    getUserInfoByEmail,
    removeUserAdmin,
    getDevListUsers
} = require('../controllers/userController');
const multer = require('multer');
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
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})


// Routes publiques (aucune authentification requise)
router.post('/create', createUser);
router.post('/check-email', checkEmailAvailability);
router.get('/info/:email', getUserInfoByEmail);
router.get('/devlist', getDevListUsers);

// Routes pour les équipes (groupées par fonctionnalité)
router.get('/teams/:centerId', verifyToken, getUsersAndGroupByTeam);
router.get('/center/:centerId', verifyToken, getUsersByCenter);
router.get('/:id/current-team', verifyToken, getUserCurrentTeam);
router.get('/:id/team-at', verifyToken, isAdmin, checkUserCenter, getUserTeamAtDate);
router.get('/:id/team-occurrences', verifyToken, isUserOrAdmin, getUserTeamOccurrences);
router.delete('/:id/team-occurrences/:occurrenceId', verifyToken, isAdmin, checkUserCenter, deleteTeamOccurrence);
router.post('/:id/assign-team', verifyToken, isUserOrAdmin, assignTeamToUser);

// Routes pour les shifts
router.post('/:id/get-shifts', verifyToken, isUserOrAdmin, getUserShifts);
router.post('/:id/get-shifts-with-substitutions', verifyToken, isUserOrAdmin, getUserShiftsWithSubstitutions);

// Routes pour les points et transactions
router.get('/:id/points', verifyToken, isUserOrAdmin, getPointsById);
router.post('/:id/points/transfer', verifyToken, transferPoints);
router.get('/:id/transactions', verifyToken, getTransactionHistory);

// Routes pour les préférences et profil utilisateur
router.get('/:id/preferences', verifyToken, isUserOrAdmin, getUserPreferences);
router.put('/:id/preferences', verifyToken, isUserOrAdmin, updateUserPreferences);
router.post('/:id/avatar', verifyToken, upload.single('avatar'), updateAvatar);
router.post('/update-email', verifyToken, updateEmail);

// Routes pour la gestion des utilisateurs (admin/master admin)
router.get('/', verifyToken,  getAllUsers);
router.get('/:id', verifyToken, isUserOrAdmin, getUserById);
router.post('/pending/:id/approve', verifyToken, isAdmin, approveUser);
router.delete('/pending/:id', verifyToken, isAdmin, deletePendingUser);
router.post('/:id/make-admin', verifyToken, isMasterAdmin, makeUserAdmin);
router.post('/:id/remove-admin', verifyToken, isMasterAdmin, removeUserAdmin);
router.delete('/:id', verifyToken, isMasterAdmin, deleteUserById);
router.post('/:id/assign-center', verifyToken, isMasterAdmin, assignUserToCenter);

module.exports = router;
