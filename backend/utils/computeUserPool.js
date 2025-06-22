import User from '../models/User.js';
import { computeShiftOfUserWithSubstitutions } from './computeShiftOfUserWithSubstitutions.js';
import { categorize } from './categorizeDemand.js';
import { getTeamAtGivenDate } from './getTeamAtGivenDate.js';

/**
 * Calcule le pool d'utilisateurs pouvant potentiellement accepter une demande
 * @param {Object} demand - La demande de substitution
 * @param {string} demand.type - Le type de demande ('substitution', 'hybrid', 'switch')
 * @param {Object} demand.posterShift - Le shift du poster
 * @param {Array} demand.acceptedSwitches - Les shifts acceptés pour l'échange
 * @param {string} demand.centerId - L'ID du centre
 * @returns {Promise<Array>} Liste des utilisateurs avec leurs capacités (canSwitch, limit)
 */
const computeUserPool = async (demand) => {
    try {
        // Récupérer tous les utilisateurs du centre (sauf le poster)
        const users = await User.find({
            centerId: demand.centerId,
            _id: { $ne: demand.posterId },
            isActive: true,
            registrationStatus: 'verified'
        });

    
        const userPool = [];

        // Analyser chaque utilisateur
        for (const user of users) {
            try {
                // Utiliser la fonction categorize pour obtenir les limites de l'utilisateur
                const categorizedDemand = await categorize(demand, user._id);
                
                // Déterminer si l'utilisateur peut accepter la demande selon le type
                let canAccept = false;
                let canSwitch = false;
                let canReplace = false;

                // Vérifier les conditions selon le type de demande
                switch (demand.type) {
                    case 'switch':
                        // Pour un switch, l'utilisateur doit pouvoir switcher
                        canSwitch = categorizedDemand.canSwitch === true && categorizedDemand.limit.length === 1;
                        canAccept = canSwitch;
                        break;

                    case 'hybrid':
                        // Pour un hybrid, l'utilisateur peut soit switcher soit remplacer
                        canSwitch = categorizedDemand.canSwitch === true && categorizedDemand.limit.length === 1;
                        canReplace = categorizedDemand.limit.length === 0;
                        canAccept = canSwitch || canReplace;
                        break;

                    case 'substitution':
                        // Pour une substitution, l'utilisateur doit pouvoir remplacer
                        canReplace = categorizedDemand.limit.length === 0;
                        canAccept = canReplace;
                        break;

                    default:
                        // Type non reconnu
                        canAccept = false;
                        break;
                }

                // Ajouter l'utilisateur au pool s'il peut accepter
                if (canAccept) {
                    userPool.push({
                        currentTeam: user.currentTeam,
                        userId: user._id,
                        name: user.name,
                        lastName: user.lastName,
                        email: user.email,
                        points: user.points,
                        canSwitch,
                        canReplace,
                        limit: categorizedDemand.limit,
                        rest: categorizedDemand.rest
                    });
                }
            } catch (error) {
                console.error(`Erreur lors de l'analyse de l'utilisateur ${user._id}:`, error);
                // Continuer avec les autres utilisateurs même si un échoue
            }
        }

        return userPool;
    } catch (error) {
        console.error('Erreur lors du calcul du pool d\'utilisateurs:', error);
        throw error;
    }
};

export { computeUserPool }; 