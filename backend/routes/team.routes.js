import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import { authorizeCenterParam, authorizeTeamAccess, authorizeBodyResourcesCenter, resolveCenterId } from '../middleware/centerAuth.js';
import { hasNoPendingCenterTransfer } from '../middleware/userStatus.js';
import Team from '../models/Team.js';
import * as teamController from '../controllers/team.controller.js';

const router = express.Router();

// Publique : le formulaire d'inscription propose les équipes du centre choisi avant qu'un compte n'existe.
// Ne renvoie que l'id et le nom.
router.get('/public/:centerId', teamController.getPublicTeamsByCenter);

// Toutes les routes ci-dessous exigent un utilisateur connecté (jeton valide, compte actif)
router.use(verifyToken);

// ── Lecture ──────────────────────────────────────────────────────────────────────────────────────────────────────────

// Récupérer les équipes d'un centre (membres du centre, ou master)
router.get('/:id', authorizeCenterParam('id'), teamController.getTeamsByCenter);

// Récupérer toutes les équipes
router.get('/', resolveCenterId, teamController.getAllTeams);

// Récupérer les shifts d'une équipe pour une période donnée (POST, mais ne modifie rien)
router.post('/:id/get-shifts', authorizeTeamAccess, teamController.getTeamShifts);

// Grille de l'équipe (membres du centre ou master) : ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD, 93 jours maximum
router.get('/:id/grid', authorizeTeamAccess, teamController.getTeamGrid);

// ── Modification : à partir d'ici, refusée à un utilisateur dont la mutation vers un autre centre est en attente ──
// (l'ordre compte : les lectures sont déclarées avant cette ligne et n'y passent pas)
router.use(hasNoPendingCenterTransfer);

// Créer une nouvelle équipe dans un centre
router.post('/center/:centerId', isAdmin, authorizeCenterParam('centerId'), teamController.createTeam);

router.put('/:id/cycle-position', isAdmin, authorizeTeamAccess, teamController.setTeamCyclePosition);
router.put('/:id/cycle-start-date', isAdmin, authorizeTeamAccess, teamController.updateTeamCycleStartDate);
router.put('/:id/name', isAdmin, authorizeTeamAccess, teamController.updateTeamName);

// Mettre à jour l'ordre des équipes
router.put('/order', isAdmin, authorizeBodyResourcesCenter(Team, { bodyField: 'teamIds', centerField: 'center' }), teamController.updateTeamsOrder);

// Supprimer une équipe
router.delete('/:id', isAdmin, authorizeTeamAccess, teamController.deleteTeam);

export default router;
