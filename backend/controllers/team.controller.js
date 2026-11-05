import Team from '../models/Team.js';
import Center from '../models/Center.js';
import User from "../models/User.js";
import { computeShiftOfTeam } from '../utils/computeShiftOfTeam.js';
import { AppError } from '../error/AppError.js';
import { isValidId } from '../utils/validation.js';
import { getTeamGrid as getTeamGridService } from '../services/team/team.grid.js';

// Créer une nouvelle équipe dans un centre
const createTeam = async (req, res, next) => {
    const { centerId } = req.params;   // POST /teams/center/:centerId, déjà vérifié par authorizeCenterParam
    const { name } = req.body;
    try {
        const center = await Center.findById(centerId);
        if (!center) {
            throw new AppError('Center not found', 404);
        }

        const newTeam = new Team({
            name: name,
            center: centerId,
        });

        await newTeam.save();

        res.status(201).json({ message: 'Team created successfully', team: newTeam });
    } catch (error) {
        console.error('Error creating team:', error);
        next(error);
    }
};

// Supprimer une équipe
const deleteTeam = async (req, res, next) => {
    const { id } = req.params;

    try {
        const team = await Team.findById(id);
        if (!team) {
            throw new AppError('Team not found', 404);
        }

        team.deleted = true;
        await team.save();

        await User.updateMany({ "teams.team": id }, { $pull: { teams: { team: id } } });

        res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        next(error);
    }
};

// Récupérer les équipes d'un centre
const getTeamsByCenter = async (req, res, next) => {
    const { id } = req.params;

    console.log(id)

    if (!id) {
        throw new AppError('Les centre est requis', 400);
    }

    try {
        const teams = await Team.find({ center: id, deleted: false });
        res.json(teams || { message: 'No teams for this center' });
    } catch (error) {
        console.error('Error fetching teams for center:', error);
        next(error);
    }
};

// Route publique (inscription) : id et nom des équipes du centre, rien d'autre
const getPublicTeamsByCenter = async (req, res, next) => {
    try {
        const { centerId } = req.params;
        if (!isValidId(centerId)) throw new AppError('ID de centre invalide.', 400);

        const teams = await Team.find({ center: centerId, deleted: false }).select('name order').sort({ order: 1 });
        res.json(teams.map(({ _id, name }) => ({ _id, name })));
    } catch (error) {
        next(error);
    }
};

// Récupérer toutes les équipes visibles par l'appelant : toutes pour le master, celles de son centre sinon
// (centre résolu par resolveCenterId)
const getAllTeams = async (req, res, next) => {
    try {
        const isMaster = req.user.adminType === 'master';
        if (!isMaster && !req.user.centerId) throw new AppError('Accès refusé. Aucun centre associé.', 403);

        const teams = await Team.find(isMaster ? { deleted: false } : { center: req.user.centerId, deleted: false });
        res.json(teams || { message: 'No teams' });
    } catch (error) {
        console.error('Error fetching teams:', error);
        next(error);
    }
};


// Récupérer les shifts d'une équipe pour une période donnée
const getTeamShifts = async (req, res, next) => {
    try {
        const { dates } = req.body;
        const { id } = req.params;

        if (!dates || !id) {
            throw new AppError(`Paramètres manquants : ${!dates ? 'dates manquantes' : 'ID d\'équipe manquant'}`, 400);
        }

        const team = await Team.findById(id);
        if (!team || team.deleted) {
            throw new AppError('Équipe non trouvée', 404);
        }

        const dateArray = Array.isArray(dates) ? dates : [dates];
        const results = await Promise.all(
            dateArray.map(async (date) => ({
                date,
                status: await computeShiftOfTeam(date, team._id)
            }))
        );

        res.json(results);
    } catch (error) {
        console.error('Erreur lors de la récupération des vacances:', error);
        next(error);
    }
};

// Grille d'une équipe (membres + renforts et leurs vacations) sur une courte période
const getTeamGrid = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { startDate, endDate } = req.query;
        if (!isValidId(id)) throw new AppError("ID d'équipe invalide", 400);
        res.json(await getTeamGridService(id, startDate, endDate));
    } catch (error) {
        next(error);
    }
};

// Mettre à jour la date de début de cycle d'une équipe
const updateTeamCycleStartDate = async (req, res, next) => {
    const { id } = req.params;
    const { cycleStartDate } = req.body;
    try {
        if (!cycleStartDate) {
            throw new AppError('Date de début de cycle manquante', 400);
        }

        const team = await Team.findByIdAndUpdate(
            id,
            { cycleStartDate },
            { new: true }
        );

        if (!team) {
            throw new AppError('Équipe non trouvée', 404);
        }

        res.json(team);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la date de début de cycle:', error);
        next(error);
    }
};

// Mettre à jour le nom d'une équipe
const updateTeamName = async (req, res, next) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const team = await Team.findByIdAndUpdate(id, { name }, { new: true });
        res.json(team);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du nom de l\'équipe:', error);
        next(error);
    }
};

/**
 * Met à jour l'ordre des équipes.
 * @param {Object} req - Requête HTTP
 * @param {Object} req.body - Corps de la requête
 * @param {Array<string>} req.body.teamIds - Liste ordonnée des IDs des équipes
 * @param {Object} res - Réponse HTTP
 */
const updateTeamsOrder = async (req, res, next) => {
    const { teamIds } = req.body;
    
    if (!Array.isArray(teamIds)) {
        throw new AppError('La liste des IDs d\'équipes est requise', 400);
    }

    try {
        // Mettre à jour l'ordre de chaque équipe
        const updatePromises = teamIds.map((teamId, index) => 
            Team.findByIdAndUpdate(teamId, { order: index }, { new: true })
        );

        await Promise.all(updatePromises);
        
        // Récupérer les équipes mises à jour
        const updatedTeams = await Team.find({ _id: { $in: teamIds } }).sort({ order: 1 });
        
        res.json(updatedTeams);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\'ordre des équipes:', error);
        next(error);
    }
};

export {
    createTeam,
    deleteTeam,
    getTeamsByCenter,
    getPublicTeamsByCenter,
    getAllTeams,
    getTeamShifts,
    getTeamGrid,
    updateTeamCycleStartDate,
    updateTeamName,
    updateTeamsOrder
}; 