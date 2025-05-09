const Substitution = require('../models/substitutionModel');
const {User} = require("../models/userModel");
const {getTeamAtGivenDate} = require("../utils/getTeamAtGivenDate");
const {computeShiftOfUser} = require("../utils/computeShiftOfUser");


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

        const statusFilter = req.query.status && req.query.status !== 'undefined' 
            ? { status: req.query.status } 
            : { };

        const baseFilter = {
            centerId: user.centerId,
            deleted: false,
            ...statusFilter
        };

        const [otherDemands, myDemands] = await Promise.all([
            Substitution.find({
                deleted: false,
                ...baseFilter,
                posterId: { $ne: userId },
                ...dateFilter
            }).sort({ 'posterShift.date': 1 }),
            Substitution.find({
                deleted: false,
                ...baseFilter,
                posterId: user._id,
                ...dateFilter
            }).sort({ 'posterShift.date': 1 })
        ]);

        const unseenDemandIds = otherDemands
            .filter(d => !d.seenBy.includes(userId))
            .map(d => d._id);

        if (unseenDemandIds.length > 0) {
            await Substitution.updateMany(
                { _id: { $in: unseenDemandIds } },
                { $push: { seenBy: userId } }
            );
        }

        const categorizedDemands = await categorizeDemands(otherDemands, userId, myDemands);
        res.status(200).json(categorizedDemands);
    } catch (error) {
        console.error('Erreur en récupérant les demandes de substitution:', error);
        res.status(500).json({ 
            message: error.message || 'Une erreur est survenue lors de la récupération des demandes',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const categorizeDemands = async (otherDemands, userId, myDemands) => {
    const categorizedDemands = [...myDemands];

    await Promise.all(otherDemands.map(async (demand) => {
        try {
            const demandDate = new Date(demand.posterShift.date);
            const vacationOfFetcher = (await computeShiftOfUser(demandDate, userId))[0];

            // Vérifier si l'utilisateur travaille déjà ce jour-là
            if (vacationOfFetcher.shift?.name !== "Rest Day" && vacationOfFetcher.shift?.type !== "rest") {
                // Vérifier si une permutation est possible
                const demandWithLimit = demand.toObject();
                demandWithLimit.limit = 'alreadyWorking';
                if (demand.acceptedSwitches && demand.acceptedSwitches.includes(vacationOfFetcher.shift._id.toString())) {
                    demandWithLimit.canSwitch = true;
                }
           
                categorizedDemands.push(demandWithLimit);
                return;
            }

            // Vérifier les périodes de repos
            const range = Array.from({ length: 13 }, (_, i) => {
                const newDate = new Date(demandDate);
                newDate.setDate(demandDate.getDate() + i - 6);
                return newDate;
            });

            const shifts = await computeShiftOfUser(range, userId);
            const previousShift = shifts[5].shift;
            const nextShift = shifts[7].shift;

            const hasElevenHoursBefore = checkRestPeriod(previousShift, demand.posterShift, 'before');
            const hasElevenHoursAfter = checkRestPeriod(nextShift, demand.posterShift, 'after');

            if (!hasElevenHoursBefore || !hasElevenHoursAfter) {
                const demandWithLimit = demand.toObject();
                demandWithLimit.limit = 'insufficientRest';
                categorizedDemands.push(demandWithLimit);
                return;
            }

            // Vérifier la limite de jours consécutifs
            if (checkConsecutiveDays(shifts, demandDate) >= 6) {
                const demandWithLimit = demand.toObject();
                demandWithLimit.limit = 'consecutiveDaysLimit';
                categorizedDemands.push(demandWithLimit);
                return;
            }

            categorizedDemands.push(demand);
        } catch (err) {
            console.error(`Erreur lors du traitement de la demande ${demand._id}:`, err);
            throw err;
        }
    }));

    return categorizedDemands;
};

const checkRestPeriod = (shift, demandShift, period) => {
  
        if (shift.type === 'rest') return true;
        
    if (period === 'before') {
        return demandShift.startTime && shift.endTime ? 
            (new Date(demandShift.startTime) - new Date(shift.endTime)) / (1000 * 60 * 60) > 11 : true;
    } else {
        return demandShift.endTime && shift.startTime ? 
            (new Date(shift.startTime) - new Date(demandShift.endTime)) / (1000 * 60 * 60) > 11 : true;
    }
    
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
            reservedForUserId 
        } = req.body;

        console.log(acceptedSwitches);

        // Validation de l'utilisateur
        const user = await User.findById(posterId).populate('teams');
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérification du shift de l'utilisateur
        const givenDate = new Date(posterShift.date);
            const userShifts = await computeShiftOfUser(givenDate, posterId);
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

        // Création de la demande
        const demand = new Substitution({
            posterId,
            posterShift: {
                ...userShift.shift,
                teamId: userShift.teamObject._id,
                date: userShift.date
            },
            comment: comment || '',
            points,
            status: 'open',
            centerId: user.centerId,
            createdAt: new Date(),
            deleted: false,
            seenBy: [],
            interested: [],
            acceptedSwitches: acceptedSwitches || []
        });

        await demand.save();
        res.status(201).json(demand);
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

        const shift = await computeShiftOfUser(new Date(request.posterShift.date), userId);



        // Mise à jour de la demande
        const updatedRequest = await Substitution.findByIdAndUpdate(
            requestId,
            {
                accepterId: userId,
                status: 'accepted',
                updatedAt: new Date()
            },
            { new: true }
        );

        // Création d'une transaction de points si nécessaire
        if (request.points > 0) {
            // TODO: Implémenter la logique de transfert de points
            // Cela nécessitera probablement un nouveau modèle Transaction
        }

        res.status(200).json({
            message: 'Demande acceptée avec succès',
            request: updatedRequest
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

function checkConsecutiveDays(shifts, demandDate) {
    const demandDay = new Date(demandDate).getDay();
    let consecutiveDays = 0;

    for (let i = 0; i < shifts.length; i++) {
        const shiftDay = new Date(shifts[i].date).getDay();
        if (shiftDay === demandDay) {
            consecutiveDays++;
        } else {
            consecutiveDays = 0;
        }

        if (consecutiveDays >= 6) {
            break;
        }
    }
    return consecutiveDays;
}

const checkUserShift = async (req, res) => {
    try {
        const userId = req.user.userId;
        const date = req.params.date;

        const userShift = await computeShiftOfUser(new Date(date), userId);

        res.status(200).json({
            hasShift: !!userShift,
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
        const { userShiftId } = req.body;

        // Récupération de la demande
        const demand = await Substitution.findById(demandId);
        if (!demand) {
            return res.status(404).json({ error: 'Demande non trouvée' });
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
        const userShift = await computeShiftOfUser(new Date(date), userId);
        if (!userShift) {
            return res.status(404).json({ error: 'Shift utilisateur non trouvé' });
        }

        // Vérification que le shift appartient bien à l'utilisateur
        if (userShift.userId.toString() !== userId) {
            return res.status(403).json({ error: 'Ce shift ne vous appartient pas' });
        }

        // Mise à jour de la demande
        const updatedDemand = await Substitution.findByIdAndUpdate(
            demandId,
            {
                accepterId: userId,
                status: 'accepted',
                updatedAt: new Date()
            },
            { new: true }
        );

  

        res.status(200).json({
            message: 'Échange de shifts effectué avec succès',
            demand: updatedDemand
        });
    } catch (error) {
        console.error('Erreur lors de l\'échange des shifts:', error);
        res.status(500).json({ error: 'Une erreur est survenue lors de l\'échange des shifts' });
    }
};

module.exports = {
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
    markInterest
}; 