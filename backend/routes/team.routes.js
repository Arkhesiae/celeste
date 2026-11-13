import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeTeamAccess, authorizeBodyResourcesCenter, resolveCenterId } from '../middleware/centerAuth.js';
import Team from '../models/Team.js';
import * as teamController from '../controllers/team.controller.js';

const router = express.Router();

// Créer une nouvelle équipe dans un centre
router.post('/center/:centerId', verifyToken, isAdmin, authorizeCenterParam('centerId'), teamController.createTeam);
router.put('/:id/cycle-position', verifyToken, isAdmin, authorizeTeamAccess, teamController.setTeamCyclePosition);
router.put('/:id/cycle-start-date', verifyToken, isAdmin, authorizeTeamAccess, teamController.updateTeamCycleStartDate);
router.put('/:id/name', verifyToken, isAdmin, authorizeTeamAccess, teamController.updateTeamName);
// Supprimer une équipe
router.delete('/:id', verifyToken, isAdmin, authorizeTeamAccess, teamController.deleteTeam);

// Publique : le formulaire d'inscription propose les équipes du centre choisi avant qu'un compte n'existe.
// Ne renvoie que l'id et le nom.
router.get('/public/:centerId', teamController.getPublicTeamsByCenter);

// Récupérer les équipes d'un centre (membres du centre, ou master)
router.get('/:id', verifyToken, authorizeCenterParam('id'), teamController.getTeamsByCenter);

// Récupérer toutes les équipes
router.get('/', verifyToken, resolveCenterId, teamController.getAllTeams);

// Récupérer les shifts d'une équipe pour une période donnée
router.post('/:id/get-shifts', verifyToken, authorizeTeamAccess, teamController.getTeamShifts);

// Grille de l'équipe (membres du centre ou master) : ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD, 93 jours maximum
router.get('/:id/grid', verifyToken, authorizeTeamAccess, teamController.getTeamGrid);

// Mettre à jour l'ordre des équipes
router.put('/order', verifyToken, isAdmin, authorizeBodyResourcesCenter(Team, { bodyField: 'teamIds', centerField: 'center' }), teamController.updateTeamsOrder);

export default router;