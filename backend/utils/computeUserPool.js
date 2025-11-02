import User from '../models/User.js';
import { categorize } from './categorizeDemand.js';
import { generateMapFromDemands } from './generateShiftsMap.js';



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
        const users = await User.find({
            centerId: demand.centerId,
            _id: { $ne: demand.posterId },
            isActive: true,
            registrationStatus: 'verified',
            'preferences.emails.all': { $ne: false },

        });

        console.log("Found", users.length, "users for demand");

        const results = await Promise.allSettled(
            users.map(async (user) => {
                let t1 = performance.now();
                const shiftsMap = await generateMapFromDemands([demand], user._id);
                let t2 = performance.now();
                console.log("Time taken to generate shifts map and categorize demand :", t2 - t1);
                const categorizedDemand = await categorize(demand, shiftsMap);
         

                let canSwitch = false;
                let canReplace = false;
                let canAccept = false;

                switch (demand.type) {
                    case 'switch':
                        canSwitch = categorizedDemand.canSwitch && categorizedDemand.limit.length === 1;
                        canAccept = canSwitch;
                        break;
                    case 'hybrid':
                        canSwitch = categorizedDemand.canSwitch && categorizedDemand.limit.length === 1;
                        canReplace = categorizedDemand.limit.length === 0;
                        canAccept = canSwitch || canReplace;
                        break;
                    case 'substitution':
                        canReplace = categorizedDemand.limit.length === 0;
                        canAccept = canReplace;
                        break;
                }

                if (!canAccept) return null;

                const mailPrefs = user.preferences.emails.categories || {};

                let isSendable = false;

                if (demand.type === 'switch') {
                    isSendable = mailPrefs.switch;
                 
                } else if (demand.type === 'substitution') {
                    isSendable = mailPrefs.replacement;
                 
                } else if (demand.type === 'hybrid') {
                    if (canSwitch && mailPrefs.switch) isSendable = true;
                    if (canReplace && mailPrefs.replacement) isSendable = true;
                  
                }

              

                if (!isSendable) return null;



                return {
                    currentTeam: user.currentTeam,
                    userId: user._id,
                    name: user.name,
                    lastName: user.lastName,
                    email: user.email,
                    points: user.points,
                    canSwitch,
                    canReplace,
                    limit: categorizedDemand.limit,
                    rest: categorizedDemand.rest,
                    shiftsMap
                };
            })
        );

        // Filter valid results
        const userPool = results
            .filter(r => r.status === "fulfilled" && r.value !== null)
            .map(r => r.value);

        console.log("Taille du pool :", userPool.length);
        return userPool;

    } catch (error) {
        console.error("Erreur lors du calcul du pool d'utilisateurs:", error);
        throw error;
    }
};

export { computeUserPool };
