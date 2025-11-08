import User from '../models/User.js';
import Substitution from '../models/Substitution.js';
import Transaction from '../models/Transaction.js';
import { getTeamAtGivenDate } from '../utils/getTeamAtGivenDate.js';
import { computeShiftOfUserWithSubstitutions } from '../utils/computeShiftOfUserWithSubstitutions.js';
import { findLatestRotation } from '../utils/findLatestRotation.js';
import { generateShiftsMap } from '../utils/generateShiftsMap.js';
import { generateMapFromDemands } from '../utils/generateShiftsMap.js';
import { shiftMapToArray } from '../utils/generateShiftsMap.js';
import { simulateInsertShift, checkMinimumRestTime, checkWeeklyRestPeriod, checkWeeklyWorkHours } from '../utils/categorizeDemand.js';
import { categorize } from '../utils/categorizeDemand.js';
import { cancelDelayedTransaction } from './transactionService.js';
import Rotation from '../models/Rotation.js';


const MIN_POINTS_TO_ACCEPT_REQUEST = -2000;
const MIN_POINTS_TO_POST_REQUEST = -40;
const MAX_POINTS_TO_ACCEPT_REQUEST = 2000;

export async function createDemand(data) {
    const {
        posterId,
        posterShift,
        comment,
        points,
        status = 'open',
        acceptedSwitches,
        isTrueSwitch
    } = data;


    // Validation de l'utilisateur
    const user = await User.findById(posterId).populate('teams');
    if (!user) {
        throw new Error({ status: 404, message: 'Utilisateur non trouvé' });
    }

    if (user.points - points < MIN_POINTS_TO_POST_REQUEST) {
        throw new Error({ status: 400, message: 'Vous ne pouvez pas poster cette demande, vous n\'avez pas assez de points' });
    }

    // Vérification du shift de l'utilisateur
    const givenDate = new Date(posterShift.date);
    const userShifts = await computeShiftOfUserWithSubstitutions(givenDate, posterId);
    const userShift = userShifts[0];

    if (!userShift || !userShift.shift) {
        throw new Error({ status: 400, message: "L'utilisateur n'a pas de shift défini pour cette date" });
    }

    // Validation de l'équipe
    const team = getTeamAtGivenDate(user.teams, givenDate);
    if (!team) {
        throw new Error({ status: 400, message: "L'utilisateur n'appartient à aucune équipe à la date spécifiée" });
    }

    // Vérification des demandes existantes
    const existingDemands = await Substitution.find({
        posterId: posterId,
        'posterShift.date': posterShift.date,
        deleted: false,
        status: { $in: ['open', 'pending', 'accepted'] }
    });
    if (existingDemands.length > 0) {
        throw new Error({ status: 400, message: 'Une demande existe déjà pour ce jour' });
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
        type: type
    });


    await demand.save();
    await demand.populate('posterShift.shift');
    return demand;
};


export async function getOpenDemands(userId, startDate, endDate) {
    if (!userId) {
        throw new Error({ status: 400, message: 'L\'identifiant de l\'utilisateur est requis' });
    }

    const user = await User.findById(userId).select('centerId');
    if (!user) {
        throw new Error({ status: 404, message: 'Utilisateur non trouvé' });
    }

    if (!startDate || !endDate) {
        throw new Error({ status: 400, message: 'Les dates sont requises' });
    }

    let parsedStartDate, parsedEndDate;


    parsedStartDate = new Date(startDate);
    parsedEndDate = new Date(endDate);
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        throw new Error({ status: 400, message: 'Format de date invalide' });
    }
    if (parsedStartDate > parsedEndDate) {
        throw new Error({ status: 400, message: 'Ordre des dates invalide' });
    }



    const dateFilter = parsedStartDate && parsedEndDate ? {
        'posterShift.date': {
            $gte: parsedStartDate,
            $lte: parsedEndDate
        }
    } : {};

    const baseFilter = {
        centerId: user.centerId,
        deleted: false,
        status: { $in: ['open', 'accepted'] }
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



    await Substitution.updateMany(
        { _id: { $in: demands.map(d => d._id) }, seenBy: { $ne: userId } },
        { $addToSet: { seenBy: userId } }
    );


    // const ownDemandsVerified = await verifyCompatibilities(myDemands, userId);

    const categorizedDemands = await categorizeDemands(demands, userId);

    const result = [...categorizedDemands, ...myDemands];
    return result;
};


const verifyCompatibilities = async (demands, userId) => {
    const list = [];
    for (const demand of demands) {
        const result = demand.toObject();
        const data = await getCompatibleSwitches(result.posterShift.date, userId);
        const incompatibleSwitches = data.filter(s => !s.compatible);
        result.incompatibleSwitches = [];
        for (const acceptedSwitch of result.acceptedSwitches) {
            if (incompatibleSwitches.some(i => i._id.toString() === acceptedSwitch.shift._id.toString())) {
                result.incompatibleSwitches.push(acceptedSwitch);
            }
        }

        list.push(result);
    }
    return list;
};

export async function getCompatibleSwitches(date, userId) {
    if (!date) {
        throw new Error({ status: 400, message: 'Date manquante' });
    }
    const demandDate = new Date(date);
    const user = await User.findById(userId);
    if (!user) {
        throw new Error({ status: 404, message: 'Utilisateur non trouvé' });
    }

    console.log(user.centerId)
    console.log(date)

    const activeRotation = await findLatestRotation(user.centerId, date);
    if (!activeRotation) {
        throw new Error({ status: 404, message: 'Tour de service actif non trouvé' });
    }

    const populateRotation = await Rotation.findById(activeRotation._id).populate('days');

    const shiftMap = await generateShiftsMap([demandDate], userId);


    const sortedShifts = shiftMapToArray(shiftMap);

    const shifts = []
    for (const day of populateRotation.days) {
        if (day.type === 'rest') continue;
        const dayLimit = []
        let compatible = false;
        const computeRest = checkMinimumRestTime(day, demandDate, sortedShifts);
        const { restOk, invalidWindow } = checkWeeklyRestPeriod(day, demandDate, sortedShifts);
        const has35hRest = restOk;
        const isWithin48h = checkWeeklyWorkHours(day, demandDate, sortedShifts);
        if (!computeRest.ok) {
            dayLimit.push('insufficientRest');
        }

        if (!has35hRest) {
            dayLimit.push('35limit');
        }

        if (!isWithin48h) {
            dayLimit.push('48hLimit');
        }

        if (dayLimit.length === 0) {
            compatible = true;
        }
        shifts.push({
            _id: day._id,
            limit: dayLimit,
            compatible: compatible,
        });
    }


    return shifts;
};








export async function getCompatibleSwitchesInRotation(date, userId, rotationId) {
    if (!date) {
        throw new Error({ status: 400, message: 'Date manquante' });
    }
    const demandDate = new Date(date);
    const user = await User.findById(userId);
    if (!user) {
        throw new Error({ status: 404, message: 'Utilisateur non trouvé' });
    }


    const populateRotation = await Rotation.findById(rotationId).populate('days');

    const shiftMap = await generateShiftsMap([demandDate], userId);


    const sortedShifts = shiftMapToArray(shiftMap);

    const shifts = []
    for (const day of populateRotation.days) {
        if (day.type === 'rest') continue;
        const dayLimit = []
        let compatible = false;
        const computeRest = checkMinimumRestTime(day, demandDate, sortedShifts);
        const { restOk, invalidWindow } = checkWeeklyRestPeriod(day, demandDate, sortedShifts);
        const has35hRest = restOk;
        const isWithin48h = checkWeeklyWorkHours(day, demandDate, sortedShifts);
        if (!computeRest.ok) {
            dayLimit.push('insufficientRest');
        }

        if (!has35hRest) {
            dayLimit.push('35limit');
        }

        if (!isWithin48h) {
            dayLimit.push('48hLimit');
        }

        if (dayLimit.length === 0) {
            compatible = true;
        }
        shifts.push({
            _id: day._id,
            limit: dayLimit,
            compatible: compatible,
        });
    }


    return shifts;
};











/**
 * Catégorise les demandes d'un utilisateur
 * @param {Array<Object>} demands - Liste des demandes
 * @param {string} userId - ID de l'utilisateur à analyser
 * @returns {Promise<Array<Object>>} Liste des demandes catégorisées
 */
export async function categorizeDemands(demands, userId) {
    try {
        // Filtrer uniquement les demandes ouvertes
        const openDemands = demands.filter(d => d.status === 'open');

        // Pré-calculer la map des shifts uniquement si nécessaire
        const shiftsMap = openDemands.length > 0
            ? await generateMapFromDemands(openDemands, userId)
            : null;

        // Catégoriser toutes les demandes en parallèle
        const categorized = await Promise.all(
            demands.map(async (demand) => {
                if (demand.status === 'open') {
                    return categorize(demand, shiftsMap);
                }
                return demand;
            })
        );

        return categorized;
    } catch (error) {
        console.error('Erreur dans categorizeDemands:', error);
        throw error;
    }
}

/**
 * Recatégorise les substitutions pour un utilisateur
 * @param {Array<string>} substitutionIds - Liste des IDs des substitutions à recatégoriser
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Array<Object>>} Liste des substitutions recatégorisées
 */
export async function recategorizeSubstitutions(substitutionIds, userId) {
    if (!userId || !substitutionIds) {
        throw new Error({ status: 400, message: 'Paramètres manquants' });
    }

    // Récupérer les substitutions avec leurs shifts populés
    const substitutions = await Substitution.find({ _id: { $in: substitutionIds } }).populate('posterShift.shift');

    if (substitutions.length === 0) {
        throw new Error({ status: 404, message: 'Aucune substitution trouvée' });
    }

    // Recatégoriser les substitutions
    const categorizedSubstitutions = await categorizeDemands(substitutions, userId);

    return categorizedSubstitutions;
}

/**
 * Annule une demande de substitution
 * @param {string} demandId - ID de la demande à annuler
 * @returns {Promise<Object>} Demande annulée
 */
export async function cancelDemand(demandId) {
    if (!demandId) {
        throw new Error({ status: 400, message: 'ID de la demande requis' });
    }

    // Mise à jour du statut de la demande
    const demand = await Substitution.findByIdAndUpdate(
        demandId,
        { status: 'canceled' },
        { new: true }
    );

    if (!demand) {
        throw new Error({ status: 404, message: 'Demande non trouvée' });
    }

    // Annuler toutes les transactions associées à la demande

    const transactions = await Transaction.find({ request: demandId, status: 'pending' });
    if (transactions.length > 0) {
        await Promise.all(transactions.map(async (transaction) => {
            try {
                await cancelDelayedTransaction(transaction._id);
            } catch (error) {
                console.error(`Erreur lors de l'annulation de la transaction ${transaction._id}:`, error);
                // On continue même si une transaction échoue à être annulée
            }
        }));
    }

    const shift = await computeShiftOfUserWithSubstitutions(new Date(demand.posterShift.date), demand.posterId);

    return { demand: demand, shift: shift[0] };
}

/**
 * Annule l'acceptation d'une demande de substitution
 * @param {string} requestId - ID de la demande
 * @param {string} userId - ID de l'utilisateur qui annule l'acceptation
 * @returns {Promise<Object>} Demande avec acceptation annulée
 */
export async function unacceptDemand(requestId, userId) {
    if (!requestId || !userId) {
        throw new Error({ status: 400, message: 'ID de la demande et ID utilisateur requis' });
    }

    // Récupération de la demande
    const request = await Substitution.findById(requestId);
    if (!request) {
        throw new Error({ status: 404, message: 'Demande non trouvée' });
    }

    // Vérification que la demande est acceptée
    if (request.status !== 'accepted') {
        throw new Error({ status: 400, message: 'Cette demande n\'est pas acceptée' });
    }

    // Vérification que l'utilisateur est bien celui qui a accepté
    if (request.accepterId.toString() !== userId) {
        throw new Error({ status: 403, message: 'Vous n\'êtes pas autorisé à annuler cette acceptation' });
    }

    // Annuler toutes les transactions associées à la demande

    const transactions = await Transaction.find({ request: requestId, status: 'pending' });
    if (transactions.length > 0) {
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
    const categorizedRequest = await categorizeDemands([updatedRequest], userId);

    return { categorizedRequest: categorizedRequest[0], shift: shift[0] };
}