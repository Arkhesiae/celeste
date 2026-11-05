import express from 'express';
const router = express.Router();
import {
    createTeam,
    deleteTeam,
    getTeamsByCenter,
    getPublicTeamsByCenter,
    getAllTeams,
    getTeamShifts,
    updateTeamCycleStartDate,
    updateTeamName,
    updateTeamsOrder
} from '../controllers/team.controller.js';

import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import Team from '../models/Team.js';
import { authorizeCenterParam, authorizeTeamAccess, authorizeBodyResourcesCenter, resolveCenterId } from '../middleware/centerAuth.js';

// Créer une nouvelle équipe dans un centre
router.post('/center/:centerId', verifyToken, isAdmin, authorizeCenterParam('centerId'), createTeam);
router.put('/:id/cycle-start-date', verifyToken, isAdmin, authorizeTeamAccess, updateTeamCycleStartDate);
router.put('/:id/name', verifyToken, isAdmin, authorizeTeamAccess, updateTeamName);
// Supprimer une équipe
router.delete('/:id', verifyToken, isAdmin, authorizeTeamAccess, deleteTeam);

// Publique : le formulaire d'inscription propose les équipes du centre choisi avant qu'un compte n'existe.
// Ne renvoie que l'id et le nom.
router.get('/public/:centerId', getPublicTeamsByCenter);

// Récupérer les équipes d'un centre (membres du centre, ou master)
router.get('/:id', verifyToken, authorizeCenterParam('id'), getTeamsByCenter);

// Récupérer toutes les équipes
router.get('/', verifyToken, resolveCenterId, getAllTeams);

// Récupérer les shifts d'une équipe pour une période donnée
router.post('/:id/get-shifts', verifyToken, authorizeTeamAccess, getTeamShifts);

// Mettre à jour l'ordre des équipes
router.put('/order', verifyToken, isAdmin, authorizeBodyResourcesCenter(Team, { bodyField: 'teamIds', centerField: 'center' }), updateTeamsOrder);

export default router;