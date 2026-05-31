import User from '../../models/User.js';
import ruleService from '../rules/ruleService.js';
import { getTeamAtGivenDate } from "../../utils/getTeamAtGivenDate.js";

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

 
        const usersWithCurrentTeam = await Promise.all(users.map(async (user) => {
            const currentTeam = await getTeamAtGivenDate(user.teams, new Date());
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
