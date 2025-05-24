const Team = require('../models/Team');

// Trouver l'équipe active à une date
const getTeamAtGivenDate = async (teams, date) => {
    if (!teams || teams.length === 0) {
        return null; // Retourner null si aucune équipe n'est assignée
    }

    const sortedTeams = teams.slice().sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));
    
    // Vérifier d'abord les renforts actifs
    for (const team of sortedTeams) {
        if (new Date(team.fromDate) <= date && new Date(team.toDate) >= date) {
            const teamDoc = await Team.findById(team.teamId);
            if (teamDoc && !teamDoc.deleted) {
                return team;
            }
        }
    }

    // Vérifier ensuite les équipes permanentes
    for (const team of sortedTeams) {
        if (!team.toDate && new Date(team.fromDate) <= date) {
            const teamDoc = await Team.findById(team.teamId);
            if (teamDoc && !teamDoc.deleted) {
                return team;
            }
        }
    }

    return null;
};

module.exports = { getTeamAtGivenDate };