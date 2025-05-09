const Team = require('../models/teamModel');
const {computeShiftOfTeam} = require("./computeShiftOfTeam");
const {getTeamAtGivenDate} = require("./getTeamAtGivenDate");
const {User} = require("../models/userModel");
const {status} = require("express/lib/response");


// Récupérer le shift d'un utilisateur à une date donnée
const computeShiftOfUser = async (dates, userId) => {
    try {
        const user = await User.findById(userId).populate('teams');
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const { teams } = user;
        if (!teams || teams.length === 0) {
            throw new Error('Aucune équipe trouvée pour cet utilisateur');
        }

        const dateArray = Array.isArray(dates) ? dates : [dates];

        const results = await Promise.all(
            dateArray.map(async (dateStr) => {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    throw new Error(`Date invalide: ${dateStr}`);
                }

                const team = await getTeamAtGivenDate(teams, date);
                if (!team) {
                    return {
                        date: dateStr,
                        status: "Pas d'équipe"
                    };
                }

                const teamObject = await Team.findById(team.teamId);
                if (!teamObject) {
                    throw new Error(`Équipe non trouvée pour l'ID: ${team.teamId}`);
                }

                const shift = await computeShiftOfTeam(date, team.teamId);
               
                return {
                    date: dateStr,
                    teamObject,
                    shift
                };
            })
        );
        return results;
    } catch (error) {
        console.error('Erreur dans computeShiftOfUser:', error.message);
        throw error;
    }       
};


module.exports = { computeShiftOfUser };