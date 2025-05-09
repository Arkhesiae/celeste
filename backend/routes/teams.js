const express = require('express');
const router = express.Router();
const {
    createTeam,
    deleteTeam,
    getTeamsByCenter,
    getAllTeams,
    getTeamShifts,
    updateTeamCycleStartDate,
    updateTeamName
} = require('../controllers/teamController');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// Créer une nouvelle équipe dans un centre
router.post('/create-team', createTeam);
router.put('/:id/cycle-start-date', verifyToken, updateTeamCycleStartDate);
router.put('/:id/name', verifyToken, isAdmin, updateTeamName);
// Supprimer une équipe
router.delete('/delete-team/:teamId', deleteTeam);

// Récupérer les équipes d'un centre
router.get('/:id', getTeamsByCenter);

// Récupérer toutes les équipes
router.get('/', getAllTeams);

// Récupérer les vacances d'une équipe pour une période donnée
router.post('/:id/get-shifts', getTeamShifts);

module.exports = router;