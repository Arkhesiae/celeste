const Team = require('../models/Team');
const Center = require('../models/Center');
const { findLatestRotation } = require('./findLatestRotation');

// Calculer le shift de travail pour une équipe donnée et une date donnée
const computeShiftOfTeam = async (date, teamId) => {
    try {
        if (!date) {
            throw new Error('Aucune date fournie');
        }

        if (!teamId) {
            throw new Error('ID d\'équipe invalide');
        }

        const team = await Team.findById(teamId);
        if (!team) {
            throw new Error(`Équipe non trouvée pour l'ID: ${teamId}`);
        }

        if (!team.center) {
            throw new Error(`Aucun centre associé à l'équipe: ${teamId}`);
        }

        const center = await Center.findById(team.center);
        if (!center) {
            throw new Error(`Centre non trouvé pour l'ID: ${team.center}`);
        }

        const latestRotation = await findLatestRotation(center._id, date);
        if (!latestRotation) {
            return null;
        }

        const diffInMilliseconds = date - new Date(team.cycleStartDate);
        const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

        const rotationPattern = latestRotation.days;
        if (!rotationPattern || rotationPattern.length === 0) {
            throw new Error('Pattern de rotation invalide');
        }
        
        const totalPatternDays = rotationPattern.length;
        let dayIndex;
        
        if (diffInDays >= 0) {
            dayIndex = diffInDays % totalPatternDays;
        } else {
            // Pour les dates antérieures, on calcule l'index en remontant dans le pattern
            dayIndex = (totalPatternDays - (Math.abs(diffInDays) % totalPatternDays)) % totalPatternDays;
        }
        
        return rotationPattern[dayIndex];
    } catch (error) {
        console.error('Erreur dans computeShiftOfTeam:', error.message);
        throw error;
    }
};

module.exports = { computeShiftOfTeam };