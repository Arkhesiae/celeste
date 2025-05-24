const Team = require('../models/Team');
const Center = require('../models/Center');
const Rotation = require('../models/Rotation');
const User = require("../models/User");
const { computeShiftOfTeam } = require('../utils/computeShiftOfTeam');

// Créer une nouvelle équipe dans un centre
const createTeam = async (req, res) => {
    const { centerId, name } = req.body;
    try {
        const center = await Center.findById(centerId);
        if (!center) {
            return res.status(404).json({ error: 'Center not found' });
        }

        const newTeam = new Team({
            name: name,
            center: centerId,
        });

        await newTeam.save();

        res.status(201).json({ message: 'Team created successfully', team: newTeam });
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Supprimer une équipe
const deleteTeam = async (req, res) => {
    const { teamId } = req.params;

    try {
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        team.deleted = true;
        await team.save();

        await User.updateMany({ "teams.team": teamId }, { $pull: { teams: { team: teamId } } });

        res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Récupérer les équipes d'un centre
const getTeamsByCenter = async (req, res) => {
    const { id } = req.params;

    try {
        const teams = await Team.find({ center: id, deleted: false });
        res.json(teams || { message: 'No teams for this center' });
    } catch (error) {
        console.error('Error fetching teams for center:', error);
        res.status(500).json({ message: 'Failed to fetch teams for center' });
    }
};

// Récupérer toutes les équipes
const getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find();
        res.json(teams || { message: 'No teams' });
    } catch (error) {
        console.error('Error fetching teams:', error);
        res.status(500).json({ message: 'Failed to fetch teams' });
    }
};


// Récupérer les shifts d'une équipe pour une période donnée
const getTeamShifts = async (req, res) => {
    try {
        const { dates } = req.body;
        const { id } = req.params;

        if (!dates || !id) {
            return res.status(400).json({ 
                error: 'Paramètres manquants',
                details: !dates ? 'Dates manquantes' : 'ID d\'équipe manquant'
            });
        }

        const team = await Team.findById(id);
        if (!team || team.deleted) {
            return res.status(404).json({ error: 'Équipe non trouvée' });
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
        res.status(500).json({ 
            error: 'Erreur serveur',
            message: error.message 
        });
    }
};

// Mettre à jour la date de début de cycle d'une équipe
const updateTeamCycleStartDate = async (req, res) => {
    const { id } = req.params;
    const { cycleStartDate } = req.body;
    try {
        const team = await Team.findByIdAndUpdate(
            id,
            { cycleStartDate },
            { new: true }
        );

        if (!team) {
            return res.status(404).json({ error: 'Équipe non trouvée' });
        }

        res.json(team);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la date de début de cycle:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// Mettre à jour le nom d'une équipe
const updateTeamName = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const team = await Team.findByIdAndUpdate(id, { name }, { new: true });
        res.json(team);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du nom de l\'équipe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

module.exports = {
    createTeam,
    deleteTeam,
    getTeamsByCenter,
    getAllTeams,
    getTeamShifts,
    updateTeamCycleStartDate,
    updateTeamName
}; 