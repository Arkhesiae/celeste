import Substitution from '../models/Substitution.js';
import User from "../models/User.js";
import { computeShiftOfUserWithSubstitutions } from "../utils/computeShiftOfUserWithSubstitutions.js";
import { createDelayedTransaction, cancelDelayedTransaction } from '../services/transactionService.js';
import Transaction from '../models/Transaction.js';
import { computeShiftOfTeam } from '../utils/computeShiftOfTeam.js';
import { computeUserPool } from '../utils/computeUserPool.js';
import * as substitutionService from '../services/substitution.service.js';
import {  sendUserPoolNotification, sendAcceptedDemandEmail, sendCancelledAcceptanceEmail } from '../services/email/userPoolNotificationEmail.js';


const MIN_POINTS_TO_ACCEPT_REQUEST = -2000;
const MIN_POINTS_TO_POST_REQUEST = -40;
const MAX_POINTS_TO_ACCEPT_REQUEST = 2000;



const getCenterDemands = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate } = req.body;
        const demands = await substitutionService.getOpenDemands(userId, startDate, endDate);
        res.status(200).json(demands);
    } catch (error) {
        console.error('Erreur en récupérant les demandes de substitution:', error);
        res.status(error.status || 500).json({ error: error.message });
    }
};



// Recatégoriser les substitutions
const recategorizeSubstitutions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { substitutionIds } = req.body;
        const categorizedSubstitutions = await substitutionService.recategorizeSubstitutions(substitutionIds, userId);
        res.status(200).json({ message: 'Substitutions recatégorisées avec succès', categorizedSubstitutions });
    } catch (error) {
        console.error('Erreur lors de la recatégorisation des substitutions:', error);
        res.status(error.status || 500).json({ error: error.message, error: error });
    }
};



// Récupérer les demandes de l'utilisateur
const getUserDemands = async (req, res) => {
    try {
        const posterId = req.query.posterId;

        if (!posterId) {
            return res.status(400).json({ error: 'posterId is required' });
        }

        const user = await User.findById(posterId);
        if (!user) {
            return res.status(404).json({ error: 'Poster not found' });
        }

        const demands = await Substitution.find({ posterId: posterId });
        res.status(200).json(demands);
    } catch (error) {
        console.error('Error fetching demands:', error);
        res.status(500).json({ error: 'An error occurred while fetching demands.' });
    }
};

// Créer une demande
const createDemand = async (req, res) => {
    try {
        const demand = await substitutionService.createDemand(req.body);
        res.status(201).json(demand);
        const populatedDemand = await demand.populate([
            { path: 'posterId', select: 'name lastName' },
            { path: 'posterShift.teamId', select: 'name' },
            { path: 'acceptedSwitches.shift', select: 'name default' },
          ])
    
     
        try {
            console.log("-- Compute user pool for demand from : ", demand.posterId.name+ " " + demand.posterId.lastName)
            let perf = performance.now();
            const userPool = await computeUserPool(populatedDemand);
            let perf2 = performance.now();
            console.log("Time taken to compute user pool : ", perf2 - perf)
            if (userPool.length > 0) {
                try {
                    sendUserPoolNotification(userPool, populatedDemand)
                        .then(results => {
                            console.log(`📧 Notifications envoyées avec succès:`, {
                                demandId: demand._id,
                                totalSent: results.sent,
                                totalFailed: results.failed
                            });
                        })
                        .catch(error => {
                            console.error('❌ Erreur lors de l\'envoi des notifications:', error);
                        });
                } catch (emailError) {
                    console.error('❌ Erreur lors de la préparation des notifications:', emailError);
                }
            }
        } catch (error) {
            console.error('Erreur lors du calcul du pool d\'utilisateurs:', error);
        }
    } catch (error) {
        console.error('❌ Erreur createDemand:', error);
        res.status(error.status || 500).json({ error: error.message });
    }
};


const cancelDemand = async (req, res) => {
    const demandId = req.params.id;
    try {
        const demand = await substitutionService.cancelDemand(demandId);
        res.status(200).json({ message: 'Demande annulée avec succès', demand: demand.demand, shift: demand.shift });
    } catch (error) {
        console.error('Erreur lors de l\'annulation de la demande:', error);
        res.status(error.status || 500).json({ error: error.message });
    }
};

const unacceptRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const requestId = req.params.id;

        // Utiliser le service pour annuler l'acceptation
        const { categorizedRequest, shift } = await substitutionService.unacceptDemand(requestId, userId);

        res.status(200).json({
            message: 'Désistement de la demande',
            request: categorizedRequest,
            newShiftData: shift
        });

        try {
            const populatedDemand = await Substitution.findById(categorizedRequest._id).populate([
                { path: 'posterId', select: 'name lastName email' },
                { path: 'posterShift.shift', select: 'name' }
            ]);
            const originalAccepter = await User.findById(userId);
            sendCancelledAcceptanceEmail(populatedDemand, originalAccepter)
                .then(results => {
                    console.log(`📧 Notifications envoyées avec succès:`, {
                        demandId: categorizedRequest._id,
                        totalSent: results.sent,
                        totalFailed: results.failed
                    });
                })
                .catch(error => {
                    console.error('❌ Erreur lors de l\'envoi des notifications:', error);
                });
        } catch (emailError) {
            console.error('❌ Erreur lors de la préparation des notifications:', emailError);
        }


    } catch (error) {
        console.error('Erreur lors de l\'annulation de l\'acceptation:', error);
        res.status(error.status || 500).json({ error: error.message });
    }
};

const deleteDemand = async (req, res) => {
    const { demandId } = req.params;

    try {
        const demand = await Substitution.findByIdAndUpdate(demandId, { deleted: true }, { new: true });
        if (!demand) {
            return res.status(404).json({ error: 'Demand not found' });
        }

        // Annuler la transaction associée si elle existe
        if (demand.points > 0) {
            const transaction = await Transaction.findOne({ request: demandId });
            if (transaction) {
                await cancelDelayedTransaction(transaction._id);
            }
        }

        res.status(200).json({ message: 'Demand deleted successfully' });
    } catch (error) {
        console.error('Error deleting demand:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateDemandStatus = async (req, res) => {
    const { status } = req.body;

    const demand = await Substitution.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(demand);
};

// const markRequestAsSeen = async (req, res) => {
//     try {
//         const userId = req.user.id;
//         const requestId = req.params.id;

//         const request = await Substitution.findByIdAndUpdate(
//             requestId,
//             {$addToSet: {seenBy: userId}},
//             {new: true}
//         );

//         if (!request) {
//             return res.status(404).json({message: 'Request not found'});
//         }

//         res.json({message: 'Request marked as seen', request});
//     } catch (error) {
//         res.status(500).json({message: 'Server error', error});
//     }
// };

const markInterest = async (req, res) => {
    try {
        const demandId = req.params.id;
        const userId = req.user.userId;

        if (!demandId) {
            return res.status(400).json({ message: 'Demand ID is required' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const demand = await Substitution.findById(demandId);
        if (!demand) {
            return res.status(404).json({ message: 'Demand not found' });
        }
        if (demand.interested.includes(userId)) {
            demand.interested = demand.interested.filter(id => id.toString() !== userId);
            await demand.save();
            res.status(200).json({ message: 'Interest removed', demand });

        }
        else {
            demand.interested.push(userId);
            await demand.save();
            res.status(200).json({ message: 'Interest added', demand });
        }


    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};


const acceptRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const requestId = req.params.id;

        // Récupération de la demande
        const request = await Substitution.findById(requestId);
        if (!request) {
            return res.status(404).json({ error: 'Demande non trouvée' });
        }

        // Vérification que la demande est ouverte
        if (request.status !== 'open') {
            return res.status(400).json({ error: 'Cette demande n\'est plus disponible' });
        }

        // Vérification que ce n'est pas sa propre demande
        if (request.posterId.toString() === userId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas accepter votre propre demande' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }


        // Mise à jour de la demande
        const updatedRequest = await Substitution.findByIdAndUpdate(
            requestId,
            {
                accepterId: userId,
                status: 'accepted',
                updatedAt: new Date()
            },
            { new: true }
        ).populate('posterShift.shift');

        const shift = await computeShiftOfUserWithSubstitutions(new Date(request.posterShift.date), userId);


        // Création d'une transaction différée si des points sont en jeu
        if (request.points > 0) {
            // if (user.points + request.points > MAX_POINTS_TO_ACCEPT_REQUEST) {
            //     return res.status(400).json({ error: 'Vous ne pouvez pas accepter cette demande, vous avez déjà assez de points' });
            // }
            await createDelayedTransaction({
                sender: request.posterId,
                receiver: userId,
                amount: request.points,
                type: 'replacement',
                request: requestId,
                description: `Remplacement du ${new Date(request.posterShift.date).toLocaleDateString('fr-FR')}`,
                scheduledDate: new Date(request.posterShift.date)
            });
        }



        try {
            const populatedDemand = await Substitution.findById(updatedRequest._id).populate([
                { path: 'posterId', select: 'name lastName email' },
                { path: 'accepterId', select: 'name lastName email' },
                { path: 'posterShift.shift', select: 'name' },
                { path: 'posterShift.teamId', select: 'name' },
              
            ]);
            sendAcceptedDemandEmail(populatedDemand)
                .then(results => {
                    console.log(`📧 Notifications envoyées avec succès:`, {
                        demandId: updatedRequest._id,
                        totalSent: results.sent,
                        totalFailed: results.failed
                    });
                })
                .catch(error => {
                    console.error('❌ Erreur lors de l\'envoi des notifications:', error);
                });
        } catch (emailError) {
            console.error('❌ Erreur lors de la préparation des notifications:', emailError);
        }

        res.status(200).json({
            message: 'Demande acceptée avec succès',
            request: updatedRequest,
            newShiftData: shift[0]
        });
    } catch (error) {
        console.error('Erreur lors de l\'acceptation de la demande:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de l\'acceptation de la demande' });
    }
};

const getSeenCount = async (req, res) => {
    try {
        const requestId = req.params.id;

        const request = await Substitution.findById(requestId).select('seenBy');

        if (!request) {
            return res.status(404).json({ message: 'Request not found' });
        }

        const seenCount = request.seenBy.length;
        res.json({ seenCount });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

const checkUserShift = async (req, res) => {
    try {
        const userId = req.user.userId;
        const date = req.params.date;

        const userShift = await computeShiftOfUserWithSubstitutions(new Date(date), userId);
        const hasShift = userShift[0] && userShift[0].shift && userShift[0].shift.type !== 'rest'

        res.status(200).json({
            hasShift: hasShift,
            shift: userShift
        });
    } catch (error) {
        console.error('Erreur lors de la vérification du shift:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de la vérification du shift' });
    }
};

const swapShifts = async (req, res) => {
    try {
        const userId = req.user.userId;
        const demandId = req.params.id;

        // Récupération de la demande
        const demand = await Substitution.findById(demandId);
        if (!demand) {
            return res.status(404).json({ error: 'Demande non trouvée' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérification que la demande est ouverte
        if (demand.status !== 'open') {
            return res.status(400).json({ error: 'Cette demande n\'est plus disponible' });
        }

        // Vérification que ce n'est pas sa propre demande
        if (demand.posterId.toString() === userId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas accepter votre propre demande' });
        }

        // Récupération du shift de l'utilisateur
        const userShift = await computeShiftOfUserWithSubstitutions(new Date(demand.posterShift.date), userId);
        if (!userShift) {
            return res.status(404).json({ error: 'Vacation utilisateur non trouvée' });
        }


        // Vérification que le shift de l'utilisateur est dans la liste des shifts acceptés pour l'échange
        const acceptedShiftData = demand.acceptedSwitches.find(
            acceptedShift => acceptedShift.shift.toString() === userShift[0].shift._id.toString()
        );

        if (!acceptedShiftData) {
            return res.status(400).json({ error: 'Votre vacation n\'est pas accepté pour cet échange' });
        }

        const acceptedShiftPoints = acceptedShiftData.points;

        const accepterShift = { shift: userShift[0].shift._id, teamId: userShift[0].teamObject._id, selectedVariation: null };

        // Mise à jour de la demande
        const updatedDemand = await Substitution.findByIdAndUpdate(
            demandId,
            {
                accepterId: userId,
                status: 'accepted',
                updatedAt: new Date(),
                accepterShift: accepterShift
            },

            { new: true }
        ).populate('posterShift.shift');

        // Création d'une transaction différée si des points sont en jeu
        if (acceptedShiftPoints > 0) {
            if (user.points + acceptedShiftPoints > MAX_POINTS_TO_ACCEPT_REQUEST) {
                return res.status(400).json({ error: 'Vous ne pouvez pas accepter cette demande, vous avez déjà assez de points' });
            }
            await createDelayedTransaction({
                sender: demand.posterId,
                receiver: userId,
                amount: acceptedShiftPoints,
                type: 'replacement',
                request: demandId,
                description: `Permutation du ${new Date(demand.posterShift.date).toLocaleDateString('fr-FR')}`,
                scheduledDate: new Date(demand.posterShift.date)
            });
        }


        const shift = await computeShiftOfUserWithSubstitutions(new Date(demand.posterShift.date), userId);


        try {
            const populatedDemand = await Substitution.findById(updatedDemand._id).populate([
                { path: 'posterId', select: 'name lastName email' },
                { path: 'accepterId', select: 'name lastName email' },
                { path: 'posterShift.shift', select: 'name' },
                { path: 'accepterShift.shift', select: 'name' },
                { path: 'accepterShift.teamId', select: 'name' }
            ]);
            sendAcceptedDemandEmail(populatedDemand)
                        .then(results => {
                            console.log(`📧 Notifications envoyées avec succès:`, {
                                demandId: updatedDemand._id,
                                totalSent: results.sent,
                                totalFailed: results.failed
                            });
                        })
                        .catch(error => {
                            console.error('❌ Erreur lors de l\'envoi des notifications:', error);
                        });
        } catch (emailError) {
            console.error('❌ Erreur lors de la préparation des notifications:', emailError);
        }

        res.status(200).json({
            message: 'Échange de vacations effectué avec succès',
            demand: updatedDemand,
            acceptedShiftPoints: acceptedShiftPoints,
            newShiftData: shift[0]
        });
    } catch (error) {
        console.error('Erreur lors de l\'échange des vacations:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de l\'échange des vacations' });
    }
};



// Détection des conflits de substitutions lors d'un changement d'équipe
const detectTeamChangeConflicts = async (req, res) => {
    try {
        const { userId, newTeamId, fromDate } = req.body;
        if (!userId || !newTeamId || !fromDate) {
            return res.status(400).json({ error: "Paramètres manquants" });
        }

        // Récupérer toutes les substitutions de l'utilisateur à partir de la date
        const substitutions = await Substitution.find({
            posterId: userId,
            deleted: false,
            status: { $in: ['open', 'pending', 'accepted'] },
            'posterShift.date': { $gte: new Date(fromDate) }
        });

        // Pour chaque substitution, simuler le shift dans la nouvelle équipe
        const conflicts = [];
        for (const sub of substitutions) {
            const date = new Date(sub.posterShift.date);

            // Shift original
            const originalShiftId = sub.posterShift.shift?._id?.toString() || sub.posterShift._id?.toString();

            // Shift simulé dans la nouvelle équipe
            const newShift = await computeShiftOfTeam(date, newTeamId);

            if (originalShiftId && newShift && originalShiftId !== newShift._id) {
                conflicts.push({ id: sub._id, newShift, originalShiftId, date });
            }
        }

        res.json({ conflicts: conflicts });
    } catch (error) {
        console.error("Erreur lors de la détection des conflits de substitutions :", error);
        res.status(500).json({ error: "Erreur du serveur" });
    }
};

// Obtenir le pool d'utilisateurs pouvant accepter une demande
const getAvailableUsers = async (req, res) => {
    try {
        const demandId = req.params.id;

        // Récupération de la demande
        const demand = await Substitution.findById(demandId);
        if (!demand) {
            return res.status(404).json({ error: 'Demande non trouvée' });
        }

        // Vérification que la demande est ouverte
        if (demand.status !== 'open') {
            return res.status(400).json({ error: 'Cette demande n\'est plus disponible' });
        }

        // Calculer le pool d'utilisateurs
        const userPool = await computeUserPool(demand);

        res.status(200).json({
            message: 'Pool d\'utilisateurs calculé avec succès',
            userPool,
            totalUsers: userPool.length
        });
    } catch (error) {
        console.error('Erreur lors du calcul du pool d\'utilisateurs:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors du calcul du pool d\'utilisateurs' });
    }
};


const getCompatibleSwitches = async (req, res) => {
    try {
        const date = req.params.date;
        const userId = req.user.userId;
        const compatibleShifts = await substitutionService.getCompatibleSwitches(date, userId);
        res.status(200).json(compatibleShifts);
    } catch (error) {
        console.error('Erreur lors de la recherche des jours compatibles:', error);
        res.status(error.status || 500).json({ error: error.message });
    }
};

// Récupérer toutes les demandes d'un centre pour les admins
const getAllCenterDemands = async (req, res) => {
    try {
        const { centerId } = req.params;
        
        if (!centerId) {
            return res.status(400).json({ error: 'centerId is required' });
        }

        // Récupérer toutes les demandes du centre avec les informations du poster et de l'accepteur
        const demands = await Substitution.find({ 
            centerId: centerId,
            deleted: false 
        })
        .populate('posterId', 'name lastName email avatar personalData')
        .populate('accepterId', 'name lastName email avatar personalData')
        .populate('posterShift.shift')
        .populate('accepterShift.shift')
        .sort({ createdAt: -1 }); // Ordonner par date de création décroissante

        res.status(200).json(demands);
    } catch (error) {
        console.error('Erreur lors de la récupération de toutes les demandes:', error);
        res.status(500).json({ error: error.message });
    }
};

export {
    getCenterDemands,
    getUserDemands,
    createDemand,
    cancelDemand,
    deleteDemand,
    updateDemandStatus,
    // markRequestAsSeen,
    acceptRequest,
    getSeenCount,
    checkUserShift,
    swapShifts,
    markInterest,
    unacceptRequest,
    detectTeamChangeConflicts,
    getAvailableUsers,
    recategorizeSubstitutions,
    //   previewEmailTemplate,
    getCompatibleSwitches,
    getAllCenterDemands
}; 