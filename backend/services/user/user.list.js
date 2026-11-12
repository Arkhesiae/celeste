import User from '../../models/User.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import ruleService from '../rules/ruleService.js';
import { getTeamAtDay } from "../team/team.atDay.js";

// Obtenir les utilisateurs d'un centre spécifique
export const getUsersByCenter = async (centerId, requestingUser) => {
    try {
        const users = await User.find({ centerId }).populate('teams');
        if (!users.length) {
            return [];
        }

        const rules = await ruleService.getAllRules(centerId);
        const transparencyRule = rules.find(r => r.name === 'Transparence');
        const showPoints = transparencyRule ? transparencyRule.value : false;
     
        const requestingUserIsAdmin = requestingUser.isAdmin;

 
        // « Aujourd'hui » dans le fuseau du centre
        const today = todayIn(await getCenterTimeZone(centerId));

        const usersWithCurrentTeam = await Promise.all(users.map(async (user) => {
            const currentTeam = getTeamAtDay(user.teams, today);
            const userObj = user.toObject();

            if (!requestingUserIsAdmin && !showPoints) {
                delete userObj.points;
            }


            return {
                ...userObj,
                currentTeam
            };
        }));

        return usersWithCurrentTeam;
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs pour un centre:', error);
        throw error;
    }
};
