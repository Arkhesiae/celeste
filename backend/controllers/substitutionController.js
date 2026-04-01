import { computeShiftOfUserWithSubstitutions } from "../utils/computeShiftOfUserWithSubstitutions.js";
import { computeShiftOfTeam } from '../utils/computeShiftOfTeam.js';
import { computeUserPool } from '../utils/computeUserPool.js';
import * as compatibilityService from '../services/substitution/compatibilityService.js';
import * as demandService from '../services/substitution/demandService.js';
import * as demandCreationService from '../services/substitution/demandCreationService.js';
import * as demandMutationsService from '../services/substitution/demandMutationsService.js';
import { sendUserPoolNotification } from '../services/email/userPoolNotificationEmail.js';
import Substitution from '../models/Substitution.js';
import User from "../models/User.js";
import { AppError } from '../error/appError.js';

const getCenterDemands = async (req, res, next) => {
    const { userId } = req.user;
    const { startDate, endDate } = req.body;

    try {

        if (!startDate || !endDate) {
            throw new AppError('Les dates sont requises', 400);
        }

        const demands = await demandService.getOpenDemands(userId, startDate, endDate);
        res.status(200).json(demands);
    } catch (err) {
        next(err);
    }
};

const getUserDemands = async (req, res, next) => {
    const { posterId } = req.user;

    try {
        const user = await User.findById(posterId);
        if (!user) {
            throw new AppError('Utilisateur non trouvé', 404);
        }

        const demands = await Substitution.find({ posterId });
        res.status(200).json(demands);
    } catch (err) {
        next(err);
    }
};

const getAllCenterDemands = async (req, res, next) => {
    const { centerId } = req.params;

    try {
        if (!centerId) {
            throw new AppError('L\'identifiant du centre est requis', 400);
        }


        const demands = await Substitution.find({ centerId, deleted: false })
            .populate('posterId', 'name lastName email avatar personalData')
            .populate('accepterId', 'name lastName email avatar personalData')
            .populate('posterShift.shift')
            .populate('accepterShift.shift')
            .sort({ createdAt: -1 });

        res.status(200).json(demands);
    } catch (err) {
        next(err);
    }
};

const consultDemand = async (req, res, next) => {
    const { demandId } = req.params;
    const { userId } = req.user;

    try {
        if (!demandId) {
            throw new AppError('L\'identifiant de la demande est requis', 400);
        }

        const demand = await demandService.consultDemand(demandId, userId);
        res.status(200).json({ message: 'Demande consultée avec succès', demand });
    } catch (err) {
        next(err);
    }
};

const getSeenCount = async (req, res, next) => {
    const { demandId } = req.params;

    try {

        if (!demandId) {
            throw new AppError('L\'identifiant de la demande est requis', 400);
        }

        const request = await Substitution.findById(demandId).select('seenBy');

        if (!request) {
            throw new AppError('Demande non trouvée', 404);
        }

        res.json({ seenCount: request.seenBy.length });
    } catch (err) {
        next(err);
    }
};

const getCompatibility = async (req, res, next) => {
    const { demandId } = req.params;
    const { userId } = req.user;
    try {
        if (!demandId) {
            throw new AppError('L\'identifiant de la demande est requis', 400);
        }
        const data = await compatibilityService.getCompatibility(demandId, userId);
        res.status(200).json(data);
    } catch (err) {
        next(err);
    }
};

const getAvailableUsers = async (req, res, next) => {
    const { demandId } = req.params;

    try {
        if (!demandId) {
            throw new AppError('L\'identifiant de la demande est requis', 400);
        }
        const demand = await Substitution.findById(demandId);

        if (!demand) {
            throw new AppError('Demande non trouvée', 404);
        }
        if (demand.status !== 'open') {
            throw new AppError('Cette demande n\'est plus disponible', 400);
        }

        const userPool = await computeUserPool(demand);
        res.status(200).json({ userPool, totalUsers: userPool.length });
    } catch (err) {
        //console.error('Erreur lors du calcul du pool d\'utilisateurs:', err);
        next(err);
    }
};

const checkUserShift = async (req, res, next) => {
    const { date } = req.params;
    const { userId } = req.user;

    try {
        if (!date) {
            throw new AppError('La date est requise', 400);
        }

        const userShift = await computeShiftOfUserWithSubstitutions(new Date(date), userId);
        const hasShift = userShift[0]?.shift?.type !== 'rest';
        res.status(200).json({ hasShift, shift: userShift });
    } catch (err) {
        next(err);
    }
};

const detectTeamChangeConflicts = async (req, res, next) => {
    const { userId, newTeamId, fromDate } = req.body;

    try {
        if (!userId || !newTeamId || !fromDate) {
            throw new AppError('Paramètres manquants', 400);
        }

        const substitutions = await Substitution.find({
            posterId: userId,
            deleted: false,
            status: { $in: ['open', 'pending', 'accepted'] },
            'posterShift.date': { $gte: new Date(fromDate) }
        });

        const conflicts = [];
        for (const sub of substitutions) {
            const originalShiftId = sub.posterShift.shift?._id?.toString() || sub.posterShift._id?.toString();
            const newShift = await computeShiftOfTeam(new Date(sub.posterShift.date), newTeamId);
            if (originalShiftId && newShift && originalShiftId !== newShift._id) {
                conflicts.push({ id: sub._id, newShift, originalShiftId, date: sub.posterShift.date });
            }
        }

        res.json({ conflicts });
    } catch (err) {
        //console.error("Erreur lors de la détection des conflits de substitutions :", err);
        next(err);
    }
};


// ─── Mutations ────────────────────────────────────────────────────────────────

const createDemand = async (req, res, next) => {
    try {
        if (!req.body.posterShift.date) {
            throw new AppError('La date est requise', 400);
        }

        if (!req.body.posterShift || !req.body.posterId || !req.body.points) {
            throw new AppError('Paramètres manquants', 400);
        }

        const demand = await demandCreationService.createDemand(req.body);
        res.status(201).json(demand);

        // Notifications en arrière-plan, après la réponse
        const populatedDemand = await demand.populate([
            { path: 'posterId', select: 'name lastName' },
            { path: 'posterShift.teamId', select: 'name' },
            { path: 'acceptedSwitches.shift', select: 'name default' },
        ]);

        const userPool = await computeUserPool(populatedDemand);
        if (userPool.length > 0) {
            sendUserPoolNotification(userPool, populatedDemand)
                .then(results => console.log(`📧 Notifications envoyées:`, results))
                .catch(error => console.error('❌ Erreur notifications:', error));
        }
    } catch (err) {
        next(err);
    }
};

// Mutations

const acceptDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;
    try {
        if (!demandId) {
            throw new AppError('Paramètres manquants', 400);
        }

        const { request, shift } = await demandMutationsService.acceptDemand(demandId, userId);
        res.status(200).json({ message: 'Demande acceptée', request, newShiftData: shift });
    } catch (err) {
        next(err);
    }
};

const swapShifts = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;

    try {
        if (!demandId) {
            throw new AppError('Paramètres manquants', 400);
        }

        const { demand, acceptedShiftPoints, shift } = await demandMutationsService.swapShifts(demandId, userId);
        res.status(200).json({
            message: 'Switch enregistré',
            demand,
            acceptedShiftPoints,
            newShiftData: shift
        });
    } catch (err) {
        next(err);
    }
};

const withdrawFromDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    const { userId } = req.user;
    if (!demandId) {
        throw new AppError('Paramètres manquants', 400);
    }

    try {
        const { categorizedRequest, shift } = await demandMutationsService.withdrawFromDemand(demandId, userId);
        res.status(200).json({ message: 'Désistement enregistré', request: categorizedRequest, newShiftData: shift });
    } catch (err) {
        next(err);
    }
};


const cancelDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    try {
        if (!demandId) {
            throw new AppError('Paramètres manquants', 400);
        }
        const demand = await demandMutationsService.cancelDemand(demandId);
        res.status(200).json({ message: 'Demande annulée avec succès', demand: demand.demand, shift: demand.shift });
    } catch (err) {
        next(err);
    }
};

const deleteDemand = async (req, res, next) => {
    const { id: demandId } = req.params;
    try {
        if (!demandId) {
            throw new AppError('Paramètres manquants', 400);
        }

        await demandMutationsService.deleteDemand(demandId);
        res.status(200).json({ message: 'Demande supprimée' });
    } catch (err) {
        next(err);
    }
};


const markInterest = async (req, res, next) => {
    try {
        const { id: demandId } = req.params;
        const { userId } = req.user;

        const demand = await Substitution.findById(demandId);

        if (!demand) {
            throw new AppError('Demande non trouvée', 404);
        }

        const alreadyInterested = demand.interested.includes(userId);
        if (alreadyInterested) {
            demand.interested = demand.interested.filter(id => id.toString() !== userId);
        } else {
            demand.interested.push(userId);
        }

        await demand.save();
        res.status(200).json({
            message: alreadyInterested ? 'Intérêt retiré' : 'Intérêt ajouté',
            demand
        });
    } catch (err) {
        next(err);
    }
};


// Recatégoriser les substitutions
const recategorizeSubstitutions = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { substitutionIds } = req.body;
        const categorizedSubstitutions = await demandService.recategorizeSubstitutions(substitutionIds, userId);
        res.status(200).json({ message: 'Substitutions recatégorisées avec succès', categorizedSubstitutions });
    } catch (err) {
        next(err);
    }
};

const getCompatibleSwitches = async (req, res, next) => {
    try {
        const date = req.params.date;
        const userId = req.user.userId;
        const compatibleShifts = await demandService.getCompatibleSwitches(date, userId);
        res.status(200).json(compatibleShifts);
    } catch (err) {
        next(err);
    }
};

export {
    getCenterDemands,
    getUserDemands,
    getAllCenterDemands,
    consultDemand,
    getSeenCount,
    getCompatibility,
    getAvailableUsers,
    checkUserShift,
    detectTeamChangeConflicts,
    createDemand,
    cancelDemand,
    deleteDemand,
    acceptDemand,
    withdrawFromDemand,
    markInterest,
    swapShifts,
    recategorizeSubstitutions,
    getCompatibleSwitches,
};