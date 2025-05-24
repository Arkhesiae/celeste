const Team = require('../models/Team');
const {computeShiftOfTeam} = require("./computeShiftOfTeam");
const {getTeamAtGivenDate} = require("./getTeamAtGivenDate");
const User = require("../models/User");
const Substitution = require('../models/Substitution');

// Récupérer le shift d'un utilisateur à une date donnée en prenant en compte les substitutions
const computeShiftOfUserWithSubstitutions = async (dates, userId) => {
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

                // Calculer d'abord le shift initial pour vérification
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

                const initialShift = await computeShiftOfTeam(date, team.teamId);

                // Vérifier les substitutions où l'utilisateur est impliqué
                const substitutions = await Substitution.find({
                    $or: [
                        { posterId: userId },
                        { accepterId: userId }
                    ],
                    status: 'accepted',
                    deleted: false,
                    $or: [
                        { 'posterShift.date': date },
                        { 'accepterShift.date': date }
                    ]
                }).sort({ createdAt: 1 }); // Tri par date de création croissante

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
                                if (currentShift._id.toString() !== substitution.posterShift._id.toString()) {
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
                                currentShift = substitution.accepterShift;
                                currentTeam = await Team.findById(substitution.accepterShift.teamId);
                                substitutionHistory.push({
                                    type: 'exchange',
                                    role: 'poster',
                                    substitutionId: substitution._id
                                });
                            } else {
                                // L'utilisateur est l'accepter, il prend le shift du poster
                                currentShift = substitution.posterShift;
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
                            } else {
                                // L'utilisateur est le remplaçant, il prend le shift du poster
                                currentShift = substitution.posterShift;
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

                // Si pas de substitution, on retourne le shift normal
                return {
                    date: dateStr,
                    teamObject,
                    shift: initialShift,
                    isSubstitution: false,
                    initialShift
                };
            })
        );
        return results;
    } catch (error) {
        console.error('Erreur dans computeShiftOfUserWithSubstitutions:', error.message);
        throw error;
    }       
};

module.exports = { computeShiftOfUserWithSubstitutions }; 