import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { findLatestRotation } from '../../utils/findLatestRotation.js';
import { generateShiftsMap } from '../../utils/generateShiftsMap.js';
import { generateMapFromDemands } from '../../utils/generateShiftsMap.js';
import { parseShiftUTC } from '../../utils/parseShiftTime.js';
import { shiftMapToArray } from '../../utils/generateShiftsMap.js';
import { checkMinimumRestTime, checkWeeklyRestPeriod, checkWeeklyWorkHours } from '../../utils/categorizeDemand.js';
import { categorize } from '../../utils/categorizeDemand.js';
import Rotation from '../../models/Rotation.js';
import { AppError } from '../../error/appError.js';

export async function getOpenDemands (userId, startDate, endDate) {
    const user = await User.findById(userId).select('centerId');
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }
    let parsedStartDate, parsedEndDate;


    parsedStartDate = new Date(startDate);
    parsedEndDate = new Date(endDate);
    if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        throw new AppError('Format de date invalide', 400);
    }
    if (parsedStartDate > parsedEndDate) {
        throw new AppError('Ordre des dates invalide', 400);
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

    const options = [
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'posterShift.teamId' },
        { path: 'accepterShift.shift', populate: { path: 'variations' } },
        { path: 'accepterShift.selectedVariation' },
        { path: 'accepterShift.teamId' },
        { path: 'acceptedSwitches.shift', select: '_id name' },
    ];

    const [demands, myDemands] = await Promise.all([
        Substitution.find({
            ...baseFilter,
            posterId: { $ne: user._id },
            ...dateFilter
        }).populate(options),
        Substitution.find({
            ...baseFilter,
            posterId: user._id,
            ...dateFilter
        }).populate(options),
    ]);

    await Substitution.updateMany(
        { _id: { $in: demands.map(d => d._id) }, seenBy: { $ne: userId } },
        { $addToSet: { seenBy: userId } }
    );

    console.log('demands', demands)
    console.log('myDemands', myDemands)

    const categorizedDemands = await categorizeDemands(demands, userId);

    const mapIsNew = (demand) => {
        const demandObj = demand.toObject ? demand.toObject() : demand;
        return {
            ...demandObj,
            isNew: !demandObj.consultedBy || !demandObj.consultedBy.some(id => id.toString() === userId.toString())
        };
    };

    const finalDemands = categorizedDemands.map(mapIsNew);
    const finalMyDemands = myDemands.map(mapIsNew);

    const result = [...finalDemands, ...finalMyDemands];
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

export async function getCompatibleSwitches (date, userId) {
    if (!date) {
        throw new AppError('Date manquante', 400);
    }
    const demandDate = new Date(date);
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
    }

    const activeRotation = await findLatestRotation(user.centerId, date);
    if (!activeRotation) {
        throw new AppError('Tour de service actif non trouvé', 404);
    }

    const populateRotation = await Rotation.findById(activeRotation._id).populate('days');

    const shiftMap = await generateShiftsMap([demandDate], userId);

    const shifts = []
    for (const day of populateRotation.days) {
        if (day.type === 'rest') continue;
        const localMap = new Map(shiftMap);


        const dayData = {
            shift: day,
            date: demandDate.toISOString().split('T')[0],
            start: parseShiftUTC(demandDate.toISOString().split('T')[0], day.default.startTime),
            end: parseShiftUTC(demandDate.toISOString().split('T')[0], day.default.endTime, day.default.endsNextDay),
        };

        localMap.set(demandDate.toISOString().split('T')[0], dayData);
        const shiftsSorted = shiftMapToArray(localMap);
        const index = shiftsSorted.findIndex(s => s.date === demandDate.toISOString().split('T')[0]);

        const dayLimit = []

        let compatible = false;


        const computeRest = checkMinimumRestTime(shiftsSorted, index);
        const { restOk, invalidWindows35 } = checkWeeklyRestPeriod(demandDate, shiftsSorted, true);
        const { workOk, invalidWindows48 } = checkWeeklyWorkHours(demandDate, shiftsSorted, true);

        // Additional Legal Checks
        // const consecutiveDays = checkConsecutiveWorkDays(demand.posterShift.shift, demandDate, shiftsSorted);
        // const nightControlRest = checkRestAfterNightControl(demand.posterShift.shift, demandDate, shiftsSorted);
        // const consecutiveNight = checkConsecutiveNightControls(demand.posterShift.shift, demandDate, shiftsSorted);

        const dayRest = {
            before: computeRest.restBefore,
            after: computeRest.restAfter
            
        };

        dayLimit.invalidRest35 = invalidWindows35;
        dayLimit.invalidWork48 = invalidWindows48;

        if (!computeRest.ok) dayLimit.push('insufficientRest');
        if (!restOk) dayLimit.push('35limit');
        if (!workOk) dayLimit.push('48hLimit');

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

export async function getCompatibleSwitchesInRotation (date, userId, rotationId) {
    if (!date) {
        throw new AppError('Date manquante', 400);
    }
    const demandDate = new Date(date);
    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('Utilisateur non trouvé', 404);
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
export async function categorizeDemands (demands, userId) {
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
export async function recategorizeSubstitutions (substitutionIds, userId) {
    if (!userId || !substitutionIds) {
        throw new AppError('Paramètres manquants', 400);
    }

    // Récupérer les substitutions avec leurs shifts populés
    const substitutions = await Substitution.find({ _id: { $in: substitutionIds } }).populate([
        { path: 'posterShift.shift', populate: { path: 'variations' } },
        { path: 'posterShift.selectedVariation' },
        { path: 'acceptedSwitches.shift', select: '_id name' }
    ]);

    if (substitutions.length === 0) {
        throw new AppError('Aucune substitution trouvée', 404);
    }

    // Recatégoriser les substitutions
    const categorizedSubstitutions = await categorizeDemands(substitutions, userId);

    return categorizedSubstitutions;
}


/**
 * Marque une demande comme consultée par un utilisateur
 * @param {string} demandId - ID de la demande
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<Object>} Demande mise à jour
 */
export async function consultDemand (demandId, userId) {
    if (!demandId || !userId) {
        throw new AppError('ID de la demande et ID utilisateur requis', 400);
    }

    const demand = await Substitution.findByIdAndUpdate(
        demandId,
        { $addToSet: { consultedBy: userId } },
        { new: true }
    );

    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }

    return demand;
}

