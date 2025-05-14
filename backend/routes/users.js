const express = require('express');
const mongoose = require("mongoose");
const {User} = require('../models/userModel.js');
const {hash} = require("bcrypt");
const {v4: uuidv4} = require('uuid');
const bcrypt = require("bcrypt");
const Team = require('../models/teamModel');
const jwt = require("jsonwebtoken");
const multer = require('multer');
const path = require('path');
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
    getUserShiftsWithSubstitutions,
    updateUserPreferences,
    getUserPreferences,
    transferPoints,
    getTransactionHistory,
    updateAvatar,
    checkEmailAvailability
} = require('../controllers/userController');
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

// Routes publiques
router.post('/create', createUser);
router.post('/check-email', checkEmailAvailability);

// Routes protégées par token
router.get('/:id', verifyToken, isUserOrAdmin, getUserById);
router.get('/:id/team-at', verifyToken, isAdmin, checkUserCenter, getUserTeamAtDate);
router.get('/:id/current-team', verifyToken, getUserCurrentTeam);
router.get('/:id/team-occurrences', verifyToken, isUserOrAdmin, getUserTeamOccurrences);
router.get('/center/:centerId', verifyToken, getUsersByCenter);
router.get('/teams/:centerId', verifyToken, getUsersAndGroupByTeam);

// Routes pour les points
router.get('/:id/points', verifyToken, isUserOrAdmin, getPointsById);
router.post('/:id/points/transfer', verifyToken, transferPoints);
router.get('/:id/transactions', verifyToken, getTransactionHistory);

router.delete('/:id/team-occurrences/:occurrenceId', verifyToken, isAdmin, checkUserCenter, deleteTeamOccurrence);

// Routes protégées par token ou admin
router.post('/:id/assign-team', verifyToken, isUserOrAdmin, assignTeamToUser);
router.post('/:id/get-shifts', verifyToken, isUserOrAdmin, getUserShifts);
router.post('/:id/get-shifts-with-substitutions', verifyToken, isUserOrAdmin, getUserShiftsWithSubstitutions);

// Routes protégées par token et rôle administrateur principal
router.get('/', verifyToken, isMasterAdmin, getAllUsers);
router.patch('/:id/approve', verifyToken, isAdmin, approveUser);
router.post('/:id/make-admin', verifyToken, isMasterAdmin, makeUserAdmin);
router.delete('/:id', verifyToken, isMasterAdmin, deleteUserById);
router.post('/:id/assign-center', verifyToken, isMasterAdmin, assignUserToCenter);

// Routes protégées par token et rôle administrateur local

// Routes pour les préférences utilisateur
router.get('/:id/preferences', verifyToken, isUserOrAdmin, getUserPreferences);
router.put('/:id/preferences', verifyToken, isUserOrAdmin, updateUserPreferences);

router.post('/:id/avatar', verifyToken, upload.single('avatar'), updateAvatar);

module.exports = router;
