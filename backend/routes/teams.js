const express = require('express');
const router = express.Router();
const {
    createTeam,
    deleteTeam,
    getTeamsByCenter,
    getAllTeams,
    getTeamShifts,
    updateTeamCycleStartDate,
    updateTeamName,
    updateTeamsOrder
} = require('../controllers/teamController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Créer une nouvelle équipe dans un centre
router.post('/create-team', verifyToken, isAdmin, createTeam);
router.put('/:id/cycle-start-date', verifyToken, isAdmin, updateTeamCycleStartDate);
router.put('/:id/name', verifyToken, isAdmin, updateTeamName);
// Supprimer une équipe
router.delete('/delete-team/:teamId', verifyToken, isAdmin, deleteTeam);

// Récupérer les équipes d'un centre
router.get('/:id', getTeamsByCenter);

// Récupérer toutes les équipes
router.get('/', verifyToken, getAllTeams);

// Récupérer les shifts d'une équipe pour une période donnée
router.post('/:id/get-shifts', verifyToken, getTeamShifts);

// Mettre à jour l'ordre des équipes
router.put('/order', verifyToken, isAdmin, updateTeamsOrder);

module.exports = router;