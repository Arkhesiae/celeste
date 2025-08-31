import Substitution from '../models/Substitution.js';
import User from "../models/User.js";
import {getTeamAtGivenDate} from "../utils/getTeamAtGivenDate.js";
import {computeShiftOfUserWithSubstitutions} from "../utils/computeShiftOfUserWithSubstitutions.js";
import { createDelayedTransaction, cancelDelayedTransaction } from '../services/transactionService.js';
import Transaction from '../models/Transaction.js';
import { computeShiftOfTeam } from '../utils/computeShiftOfTeam.js';
import { categorize } from '../utils/categorizeDemand.js';
import { generateShiftsMap } from '../utils/generateShiftsMap.js';
import { computeUserPool } from '../utils/computeUserPool.js';
import { sendUserPoolNotification, sendUserNotification } from '../services/email/userPoolNotificationEmail.js';
import { buildUserPoolNotificationEmail } from '../services/email/demandEmailModels.js';
import Shift from '../models/Shift.js';

    
const MIN_POINTS_TO_ACCEPT_REQUEST = -2000;
const MIN_POINTS_TO_POST_REQUEST = -40;
const MAX_POINTS_TO_ACCEPT_REQUEST = 2000;

const getCenterDemands = async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!userId) {
            return res.status(400).json({ message: 'L\'identifiant de l\'utilisateur est requis' });
        }

        const user = await User.findById(userId).select('centerId');
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        let startDate, endDate;
        if (req.query.startDate && req.query.endDate) {
            try {
                startDate = new Date(JSON.parse(req.query.startDate));
                endDate = new Date(JSON.parse(req.query.endDate));
                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    return res.status(400).json({ message: 'Format de date invalide' });
                }
                if (startDate> endDate) {
                    return res.status(400).json({ message: 'Ordre des dates invalide' });
                }
            } catch (error) {
                return res.status(400).json({ message: 'Format de dates invalide' });
            }
        } 
        else {
            return res.status(404).json({ message: 'Les dates sont requises' });
        }


        const dateFilter = startDate && endDate ? {
            'posterShift.date': { 
                $gte: startDate, 
                $lte: endDate 
            }
        } : {};

        const baseFilter = {
            centerId: user.centerId,
            deleted: false,
            status: { $nin: ['canceled', 'completed'] }
        };

        const [demands, myDemands] = await Promise.all([
            Substitution.find({
                deleted: false,
                ...baseFilter,
                posterId: { $ne: user._id },
                ...dateFilter
            }).populate('posterShift.shift'),
            Substitution.find({
                deleted: false,
                ...baseFilter,
                posterId: user._id,
                ...dateFilter
            }).populate('posterShift.shift')
        ]);

     

        const unseenDemandIds = demands
            .filter(d => !d.seenBy.includes(userId))
            .map(d => d._id);

        if (unseenDemandIds.length > 0) {
            await Substitution.updateMany(
                { _id: { $in: unseenDemandIds } },
                { $push: { seenBy: userId } }
            );
        }


        const categorizedDemands = await categorizeDemands(demands, userId);

        const result = [...categorizedDemands, ...myDemands];
        res.status(200).json(result);
    } catch (error) {
        console.error('Erreur en récupérant les demandes de substitution:', error);
        res.status(500).json({ 
            message: error.message || 'Une erreur est survenue lors de la récupération des demandes',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const categorizeDemands = async (demands, userId) => {
    const categorizedDemands = [];
  
    // Pré-calculer la map des shifts pour optimiser les performances
    const openDemands = demands.filter(d => d.status === 'open');
    let shiftsMap = null;
    
    if (openDemands.length > 0) {
        try {
            shiftsMap = await generateShiftsMap(openDemands, userId);
        } catch (error) {
            console.error('Erreur lors de la préparation de la map des shifts:', error);
        }
    }


  
    await Promise.all(demands.map(async (demand) => {
        try {
            if (demand.status === 'open') {
                const categorizedDemand = await categorize(demand, shiftsMap);
                categorizedDemands.push(categorizedDemand);
            }
            else {
                categorizedDemands.push(demand);
            }
        } catch (err) {
            console.error(`Erreur lors du traitement de la demande ${demand._id}:`, err);
            throw err;
        }
    }));


    return categorizedDemands;
};

const getUserDemands = async (req, res) => {
    try {
        const posterId = req.query.posterId;

        if (!posterId) {
            return res.status(400).json({error: 'posterId is required'});
        }

        const user = await User.findById(posterId);
        if (!user) {
            return res.status(404).json({error: 'Poster not found'});
        }

        const demands = await Substitution.find({posterId: posterId});
        res.status(200).json(demands);
    } catch (error) {
        console.error('Error fetching demands:', error);
        res.status(500).json({error: 'An error occurred while fetching demands.'});
    }
};

const createDemand = async (req, res) => {
    try {
        const { 
            posterId, 
            posterShift, 
            comment, 
            points, 
            status = 'open',
            acceptedSwitches,
            reservedForUserId,
            isTrueSwitch
        } = req.body;


        // Validation de l'utilisateur
        const user = await User.findById(posterId).populate('teams');
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        if (user.points - points < MIN_POINTS_TO_POST_REQUEST) {
            return res.status(400).json({ error: 'Vous ne pouvez pas poster cette demande, vous n\'avez pas assez de points' });
        }

        // Vérification du shift de l'utilisateur
        const givenDate = new Date(posterShift.date);
        const userShifts = await computeShiftOfUserWithSubstitutions(givenDate, posterId);
        const userShift = userShifts[0];
            
        if (!userShift || !userShift.shift) {
            return res.status(400).json({ error: "L'utilisateur n'a pas de shift défini pour cette date" });
        }

        // Validation de l'équipe
        const team = getTeamAtGivenDate(user.teams, givenDate);
        if (!team) {
            return res.status(400).json({error: "L'utilisateur n'appartient à aucune équipe à la date spécifiée"});
        }

        // Vérification des demandes existantes
        const existingDemands = await Substitution.find({ 
            posterId: posterId, 
            'posterShift.date': posterShift.date,
            deleted: false,
            status: { $in: ['open', 'pending', 'accepted'] }
        });
        if (existingDemands.length > 0) {
            return res.status(400).json({ error: 'Une demande existe déjà pour ce jour' });
        }

        let type;
        if (isTrueSwitch) {
            type = "switch";
        } else {
            type = acceptedSwitches.length > 0 ? "hybrid" : "substitution";
        }

        // Création de la demande
        const demand = new Substitution({
            posterId,
            posterShift: {
                shift: userShift.shift._id,
                selectedVariation: null,
                teamId: userShift.teamObject._id,
                date: userShift.date
            },
            comment: comment || '',
            points,
            status: status,
            centerId: user.centerId,
            createdAt: new Date(),
            deleted: false,
            seenBy: [],
            interested: [],
            acceptedSwitches: acceptedSwitches || [],
            isTrueSwitch: isTrueSwitch || false,    
            type : type
        });

    
        await demand.save();
        demand.posterShift.shift = await Shift.findById(demand.posterShift.shift)
        res.status(201).json(demand);
        // Calculer et afficher le pool d'utilisateurs pouvant accepter cette demande
        try {
        
            const userPool = await computeUserPool(demand);
            if (userPool.length > 0) {
                try {
                    const populatedDemand = await Substitution.findById(demand._id).populate('posterId', 'name lastName');
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
        console.error('Erreur lors de la création de la demande:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                error: 'Données invalides', 
                details: Object.values(error.errors).map(err => err.message) 
            });
        }
        res.status(500).json({ error: 'Une erreur est survenue lors de la création de la demande.' });
    }
};

const cancelDemand = async (req, res) => {
    const demandId = req.params.id;
    console.log('demandId', demandId);
    try {
      
        const demand = await Substitution.findByIdAndUpdate(demandId, {status: 'canceled'}, {new: true});
        if (!demand) {
            return res.status(404).json({error: 'Demand not found'});
        }

        
        // Annuler toutes les transactions associées à la demande
        if (demand.points > 0) {
            const transactions = await Transaction.find({ request: demandId });
            await Promise.all(transactions.map(async (transaction) => {
                try {
                    await cancelDelayedTransaction(transaction._id);
                } catch (error) {
                    console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
                    // On continue même si une transaction échoue à être annulée
                }
            }));
        }


        res.status(200).json({message: 'Demand deleted successfully'});
    } catch (error) {
        console.error('Error deleting demand:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

const deleteDemand = async (req, res) => {
    const {demandId} = req.params;

    try {
        const demand = await Substitution.findByIdAndUpdate(demandId, {deleted: true}, {new: true});
        if (!demand) {
            return res.status(404).json({error: 'Demand not found'});
        }

        // Annuler la transaction associée si elle existe
        if (demand.points > 0) {
            const transaction = await Transaction.findOne({ request: demandId });
            if (transaction) {
                await cancelDelayedTransaction(transaction._id);
            }
        }

        res.status(200).json({message: 'Demand deleted successfully'});
    } catch (error) {
        console.error('Error deleting demand:', error);
        res.status(500).json({error: 'Internal server error'});
    }
};

const updateDemandStatus = async (req, res) => {
    const {status} = req.body;

    const demand = await Substitution.findByIdAndUpdate(req.params.id, {status}, {new: true});
    res.json(demand);
};

const markRequestAsSeen = async (req, res) => {
    try {
        const userId = req.user.id;
        const requestId = req.params.id;

        const request = await Substitution.findByIdAndUpdate(
            requestId,
            {$addToSet: {seenBy: userId}},
            {new: true}
        );

        if (!request) {
            return res.status(404).json({message: 'Request not found'});
        }

        res.json({message: 'Request marked as seen', request});
    } catch (error) {
        res.status(500).json({message: 'Server error', error});
    }
};

const markInterest = async (req, res) => {
    try {
        const demandId = req.params.id;
        const userId = req.user.userId;

        if (!demandId) {
            return res.status(400).json({message: 'Demand ID is required'});
        }

        if (!userId) {
            return res.status(400).json({message: 'User ID is required'});
        }

        const demand = await Substitution.findById(demandId);
        if (!demand) {
            return res.status(404).json({message: 'Demand not found'});
        }
        if (demand.interested.includes(userId)) {
            demand.interested = demand.interested.filter(id => id.toString() !== userId);
            await demand.save();
            res.status(200).json({message: 'Interest removed', demand});
            
        }
        else {
            demand.interested.push(userId);
            await demand.save();
            res.status(200).json({message: 'Interest added', demand});
        }

        
    } catch (error) {
        res.status(500).json({message: 'Server error', error});
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
        ).populate('posterShift.shift') ;

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
            const populatedDemand = await Substitution.findById(updatedRequest._id).populate('posterId', 'name lastName email').populate('accepterId', 'name lastName email ');
            sendUserNotification(populatedDemand, 'accepted')
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
            return res.status(404).json({message: 'Request not found'});
        }

        const seenCount = request.seenBy.length;
        res.json({seenCount});
    } catch (error) {
        res.status(500).json({message: 'Server error', error});
    }
};

const checkUserShift = async (req, res) => {
    try {
        const userId = req.user.userId;
        const date = req.params.date;

        const userShift = await computeShiftOfUserWithSubstitutions(new Date(date), userId);
        const hasShift = userShift[0] && userShift[0].shift && userShift[0].shift.type !== 'rest'

        console.log(userShift);
        console.log(hasShift);
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

        const accepterShift = {...userShift[0].shift, teamId: userShift[0].teamObject._id};
   
        
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
        ).populate('posterShift.shift') ;

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
            const populatedDemand = await Substitution.findById(updatedDemand._id).populate('posterId', 'name lastName email').populate('accepterId', 'name lastName email ');
            sendUserNotification(populatedDemand, 'accepted')
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

const unacceptRequest = async (req, res) => {
    try {
        const userId = req.user.userId;
        const requestId = req.params.id;

        // Récupération de la demande
        const request = await Substitution.findById(requestId);
        if (!request) {
            return res.status(404).json({ error: 'Demande non trouvée' });
        }

        // Vérification que la demande est acceptée
        if (request.status !== 'accepted') {
            return res.status(400).json({ error: 'Cette demande n\'est pas acceptée' });
        }

        // Vérification que l'utilisateur est bien celui qui a accepté
        if (request.accepterId.toString() !== userId) {
            return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à annuler cette acceptation' });
        }

        // Annuler toutes les transactions associées à la demande
        if (request.points > 0) {
            const transactions = await Transaction.find({ request: requestId });
            await Promise.all(transactions.map(async (transaction) => {
                try {
                    await cancelDelayedTransaction(transaction._id);
                } catch (error) {
                    console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
                    // On continue même si une transaction échoue à être annulée
                }
            }));
        }

        // Mise à jour de la demande
        const updatedRequest = await Substitution.findByIdAndUpdate(
            requestId,
            {
                accepterShift: null,
                accepterId: null,
                status: 'open',
                updatedAt: new Date()
            },
            { new: true }
        ).populate('posterShift.shift');

        const shift = await computeShiftOfUserWithSubstitutions(new Date(updatedRequest.posterShift.date), userId);
        const requestToReturn = await categorizeDemands([updatedRequest], userId);

        try {
            const populatedDemand = await Substitution.findById(updatedRequest._id).populate('posterId', 'name lastName email')
            const originalAccepter = await User.findById(userId);
            sendUserNotification(populatedDemand, 'cancelled', originalAccepter)
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
            message: 'Acceptation annulée avec succès',
            request: requestToReturn[0],
            newShiftData: shift[0]
        });
    } catch (error) {
        console.error('Erreur lors de l\'annulation de l\'acceptation:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de l\'annulation de l\'acceptation' });
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
                conflicts.push({id : sub._id, newShift, originalShiftId, date});
            }
        }

        res.json({ conflicts: conflicts });
    } catch (error) {
        console.error("Erreur lors de la détection des conflits de substitutions :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
};

// Obtenir le pool d'utilisateurs pouvant accepter une demande
const getUserPool = async (req, res) => {
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

const recategorizeSubstitutions = async (req, res) => {
    const userId = req.user.userId;
    const { substitutionIds } = req.body;

    if (!userId || !substitutionIds) {
        return res.status(400).json({ error: 'Paramètres manquants' });
    }

    const substitutions = await Substitution.find({ _id: { $in: substitutionIds } }).populate('posterShift.shift');


    const categorizedSubstitutions = await categorizeDemands(substitutions, userId);

    res.status(200).json({ message: 'Substitutions recatégorisées avec succès', categorizedSubstitutions });
};

// Endpoint pour visualiser le template d'email
const previewEmailTemplate = async (req, res) => {
    try {
        const demandId = req.params.id;

        // Récupération de la demande avec populate
        const demand = await Substitution.findById(demandId).populate('posterId', 'name lastName');
        if (!demand) {
            return res.status(404).json({ error: 'Demande non trouvée' });
        }

        // Générer le template d'email
        const { subject, html, text } = buildUserPoolNotificationEmail(demand);

        res.status(200).json({
            subject,
            html,
            text,
            demand: {
                id: demand._id,
                type: demand.type,
                posterName: demand.posterId?.name,
                posterLastName: demand.posterId?.lastName,
                shiftDate: demand.posterShift.date,
                shiftName: demand.posterShift.name,
                startTime: demand.posterShift.startTime,
                endTime: demand.posterShift.endTime,
                points: demand.points,
                comment: demand.comment
            }
        });
    } catch (error) {
        console.error('Erreur lors de la génération du template:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de la génération du template' });
    }
};

export {
    getCenterDemands,
    getUserDemands,
    createDemand,
    cancelDemand,
    deleteDemand,
    updateDemandStatus,
    markRequestAsSeen,
    acceptRequest,
    getSeenCount,
    checkUserShift,
    swapShifts,
    markInterest,
    unacceptRequest,
    detectTeamChangeConflicts,
    getUserPool,
    recategorizeSubstitutions,
    previewEmailTemplate
}; 