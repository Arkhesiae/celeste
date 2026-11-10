import Team from '../../models/Team.js';
import { findOrThrow } from '../../utils/mongo.js';
import Center from '../../models/Center.js';
import { findLatestRotation } from './findLatestRotation.js';
import Shift from '../../models/Shift.js';
import Rotation from '../../models/Rotation.js';
import { AppError } from '../../error/AppError.js';
import { cycleDayIndex } from '../../utils/teamCycle.js';

// Calculer le shift de travail pour une équipe donnée et une date donnée
const computeShiftOfTeam = async (date, teamData) => {
    try {
        if (!date) {
            throw new AppError('Aucune date fournie', 400);
        }

        if (!teamData) {
            throw new AppError('Données d\'équipe invalides', 400);
        }

        if (!teamData.center) {
            throw new AppError(`Aucun centre associé à l'équipe: ${teamData.teamId}`, 404);
        }

        const center = await findOrThrow(Center, teamData.center, { message: `Centre non trouvé pour l'ID: ${teamData.center}` });
        let latestRotation = await findLatestRotation(center._id, date);
        if (!latestRotation) {
            return null;
        }   

        if (latestRotation.days.length > 0) {
            const firstDay = latestRotation.days[0];
            const needsPopulate = typeof firstDay === 'string' ||
                firstDay?.constructor?.name === 'ObjectId' ||
                firstDay?.constructor?.name === 'ObjectID' ||
                !firstDay?.default;
            if (needsPopulate) {
                latestRotation = await Rotation.findById(latestRotation._id).populate({
                    path: 'days',
                    populate: { path: 'variations' }
                });
            }
        }
        

        const rotationPattern = latestRotation.days;
        if (!rotationPattern || rotationPattern.length === 0) {
            throw new Error('Pattern de rotation invalide');
        }

        // Début de cycle défini par l'ancre du centre + offset de l'équipe (repli : ancien cycleStartDate)
        const dayIndex = cycleDayIndex(teamData, center, date, rotationPattern.length);
        if (dayIndex === null) return null;   // équipe sans début de cycle

        return rotationPattern[dayIndex];
    } catch (error) {
        console.error('Erreur dans computeShiftOfTeam:', error.message);
        throw error;
    }
};

export { computeShiftOfTeam };