import Team from '../models/Team.js';
import {computeShiftOfTeam} from "./computeShiftOfTeam.js";
import {getTeamAtGivenDate} from "./getTeamAtGivenDate.js";
import User from "../models/User.js";
import Substitution from '../models/Substitution.js';
import PlanningModification from '../models/PlanningModification.js';
import Shift from '../models/Shift.js';
// Récupérer le shift d'un utilisateur à une date donnée en prenant en compte les substitutions et modifications de planning
const computeShiftOfUserWithSubstitutions = async (dates, userId) => {
    try {
        const user = await User.findById(userId).populate('teams');
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const { teams } = user;
        if (!teams || teams.length === 0) {
            console.log('Aucune équipe trouvée pour cet utilisateur');
           
        }

     

        const dateArray = Array.isArray(dates) ? dates : [dates];
        const results = await Promise.all(
            dateArray.map(async (dateStr) => {
              
                const date = new Date(dateStr);
           
                if (isNaN(date.getTime())) {
                    throw new Error(`Date invalide: ${dateStr}`);
                }

                let initialShift = null;
                let teamObject = null;
                let selectedVariation = null;
                let team = null;
                
                if (!teams || teams.length === 0) {
                    team = null;
                }
                else {
                    team = await getTeamAtGivenDate(teams, date);
                }
                
                if (team) {
                    teamObject = await Team.findById(team.teamId);
                    if (!teamObject) {
                        throw new Error(`Équipe non trouvée pour l'ID: ${team.teamId}`);
                    }
    
                    initialShift = await computeShiftOfTeam(date, team.teamId);
                 
                }

                
                else {
                    teamObject = null;
                    initialShift = null;
                    selectedVariation = null;
                }



                // Vérifier les modifications de planning approuvées pour cette date (priorité maximale)
                const planningModifications = await PlanningModification.find({
                    userId: userId,
                    date: date,
                }).sort({ createdAt: 1 });

                // Vérifier si le shift initial est optionnel et pas de modifications
                if (initialShift && initialShift.optional && planningModifications.length === 0) {
                
                    return {
                        date: dateStr,
                        isOff : true,
                        shift : null,
                        initialShift : initialShift,
                        teamObject,
                        selectedVariation
                    };
                }

                // Si l'utilisateur a des modifications de planning approuvées pour cette date
                if (planningModifications?.length > 0) {
                    const modification = planningModifications[0];
                    selectedVariation = modification.selectedVariation;
      
                    if (modification.isOff) {
                      
                        return {
                            date: dateStr,
                            isOff : modification.isOff,
                            shift : null,
                            initialShift : initialShift,
                            selectedVariation : selectedVariation,
                            teamObject
                        };
                }
            }

                // Vérifier les substitutions où l'utilisateur est impliqué (priorité inférieure aux modifications de planning)
                const substitutions = await Substitution.find({
                    $and: [
                        {
                            $or: [
                                { posterId: userId },
                                { accepterId: userId }
                            ]
                        },
                        {
                            $or: [
                                { 'posterShift.date': date },
                                { 'accepterShift.date': date }
                            ]
                        },
                        { status: 'accepted' },
                        { deleted: false }
                    ]
                }).sort({ createdAt: 1 });

                // Si l'utilisateur a des substitutions acceptées pour cette date
                if (substitutions.length > 0) {
                   
                    let currentShift = initialShift;
                    let currentTeam = teamObject;
                    let substitutionHistory = [];
        
                    // Traiter chaque substitution dans l'ordre chronologique
                    for (const substitution of substitutions) {
                    
                        // Vérifier la cohérence de la substitution
                        if (substitution.posterId.toString() === userId) {
                            if (currentShift && substitution.posterShift) {
                                if (currentShift._id.toString() !== substitution.posterShift?._id?.toString() && currentShift._id.toString() !== substitution.posterShift?.shift?._id?.toString()) {
                                    console.warn(`Incohérence détectée pour l'utilisateur ${userId} à la date ${dateStr}:
                                        Shift actuel: ${currentShift._id}
                                        Shift dans la substitution: ${substitution.posterShift._id}`);
                                }
                            }
                        }

                        // Si c'est un échange (les deux shifts sont présents)
                        if (substitution.posterShift && substitution.accepterShift) {
                            if (substitution.posterId.toString() === userId) {
                                // L'utilisateur est le poster, il prend le shift de l'accepter
                                currentShift = await Shift.findById(substitution.accepterShift.shift);

                                currentTeam = await Team.findById(substitution.accepterShift.teamId);
                                substitutionHistory.push({
                                    type: 'exchange',
                                    role: 'poster',
                                    substitutionId: substitution._id
                                });
                            } else {
                                // L'utilisateur est l'accepter, il prend le shift du poster
                                currentShift = await Shift.findById(substitution.posterShift.shift);
                                currentTeam = await Team.findById(substitution.posterShift.teamId);
                                substitutionHistory.push({
                                    type: 'exchange',
                                    role: 'accepter',
                                    substitutionId: substitution._id
                                });
                            }
                        } else {
                            // C'est un simple remplacement
                            if (substitution.posterId.toString() === userId) {
                                // L'utilisateur est remplacé, il n'a pas de shift
                                currentShift = null;
                                substitutionHistory.push({
                                    type: 'replacement',
                                    role: 'poster',
                                    substitutionId: substitution._id
                                });
                            } else  {
                                // L'utilisateur est le remplaçant, il prend le shift du poster
                                if (substitution.posterShift.shift) {
                                    currentShift = await Shift.findById(substitution.posterShift.shift);
                                }
                                else {
                                    currentShift = substitution.posterShift;
                                }
                               
                                currentTeam = await Team.findById(substitution.posterShift.teamId);
                                substitutionHistory.push({
                                    type: 'replacement',
                                    role: 'accepter',
                                    substitutionId: substitution._id
                                });
                            }
                        }
                    }

                    // Retourner le résultat final après avoir traité toutes les substitutions
                    if (!currentShift) {
                        return {
                            date: dateStr,
                            status: "Remplacé",
                            isSubstitution: true,
                            substitutionType: substitutionHistory[substitutionHistory.length - 1].type,
                            initialShift,
                            substitutionHistory
                        };
                    }

                    return {
                        date: dateStr,
                        teamObject: currentTeam,
                        shift: currentShift,
                        isSubstitution: true,
                        substitutionType: substitutionHistory[substitutionHistory.length - 1].type,
                        initialShift,
                        substitutionHistory
                    };
                }


                // Si pas de substitution ni de modification, on retourne le shift normal
                return {
                    date: dateStr,
                    teamObject,
                    shift: initialShift,
                    isSubstitution: false,
                    initialShift,
                    selectedVariation
                };
            
            })
        );
       

        return results;
    } catch (error) {
        console.error('Erreur dans computeShiftOfUserWithSubstitutions:', error.message);
        throw error;
    }       
};

const computeShiftOfUserWithoutSubstitutions = async (dates, userId) => {
    try {
        const user = await User.findById(userId).populate('teams');
        if (!user) {
            throw new Error('Utilisateur non trouvé');
        }

        const dateArray = Array.isArray(dates) ? dates : [dates];
        const results = await Promise.all(
            dateArray.map(async (dateStr) => {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) {
                    throw new Error(`Date invalide: ${dateStr}`);
                }

                const team = await getTeamAtGivenDate(user.teams, date);
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
    }
    catch (error) {
        console.error('Erreur dans computeShiftOfUserWithoutSubstitutions:', error.message);
        throw error;
    }
}   

export { computeShiftOfUserWithSubstitutions, computeShiftOfUserWithoutSubstitutions }; 