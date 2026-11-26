import User from '../../models/User.js';
import { getCenterTimeZone, getCenterTimeZones } from '../center/center.timezone.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import * as ruleService from '../rule/rule.service.js';
import { getTeamAtDay } from "../team/team.atDay.js";
import { AppError } from '../../error/AppError.js';

/** Un utilisateur (objet simple) avec son équipe d'un jour : l'occurrence qui fait autorité, ou `null` */
const withCurrentTeam = (user, today) => ({ ...user.toObject(), currentTeam: getTeamAtDay(user.teams, today) });

// Obtenir les utilisateurs d'un centre spécifique
export const getUsersByCenter = async (centerId, requestingUser) => {
    try {
        const users = await User.find({ centerId });
        if (!users.length) {
            return [];
        }

        const rules = await ruleService.getAllRules(centerId);
        const transparencyRule = rules.find(r => r.name === 'Transparence');
        const showPoints = transparencyRule ? transparencyRule.value : false;
     
        const requestingUserIsAdmin = requestingUser.isAdmin;

 
        // « Aujourd'hui » dans le fuseau du centre
        const today = todayIn(await getCenterTimeZone(centerId));

        return users.map((user) => {
            const listed = withCurrentTeam(user, today);
            if (!requestingUserIsAdmin && !showPoints) delete listed.points;
            return listed;
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs pour un centre:', error);
        throw error;
    }
};

/**
 * Tous les utilisateurs visibles par l'appelant avec leur équipe du jour : l'administrateur principal voit tout le
 * monde, un administrateur local seulement son centre. « Aujourd'hui » est le jour du centre de chaque utilisateur.
 */
export const getAllUsers = async (requestingUser) => {
    const isMaster = requestingUser.adminType === 'master';
    if (!isMaster && !requestingUser.centerId) throw new AppError('Accès refusé. Aucun centre associé.', 403);

    const users = await User.find(isMaster ? {} : { centerId: requestingUser.centerId });
    const timeZones = await getCenterTimeZones(users.map((u) => u.centerId));

    return users.map((user) => withCurrentTeam(user, todayIn(timeZones.get(String(user.centerId)))));
};

/** Un utilisateur par identifiant ; 404 s'il n'existe pas */
export const getUserById = async (id) => {
    const user = await User.findById(id);
    if (!user) {
        throw new AppError('User not found.', 404);
    }
    return user;
};

/** Outil de connexion rapide réservé au développement (inexistant en production) : agents rattachés à une équipe */
export const listDevUsers = async (role) => {
    if (process.env.NODE_ENV === 'production') throw new AppError('Route introuvable', 404);

    if (role === 'team') {
        // Tous les users rattachés à une équipe, hors master (un agent promu admin local doit rester sélectionnable)
        return User.find({
            isActive: true,
            adminType: { $ne: 'master' },
            'teams.0': { $exists: true },
        }).select('name lastName email teams centerId isAdmin adminType');
    }

    // Pour l'instant, nous ne gérons que le cas 'team'
    throw new AppError('Rôle non supporté', 400);
};
