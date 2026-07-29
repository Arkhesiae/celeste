import User from '../../models/User.js';
import Substitution from '../../models/Substitution.js';
import { findLatestRotation } from '../../utils/findLatestRotation.js';
import { generateShiftsMap } from '../../utils/generateShiftsMap.js';
import { parseShiftUTC } from '../../utils/parseShiftTime.js';
import { shiftMapToArray } from '../../utils/generateShiftsMap.js';
import { checkMinimumRestTime, checkWeeklyRestPeriod, checkWeeklyWorkHours } from '../../utils/categorizeDemand_v2.js';
import Rotation from '../../models/Rotation.js';
import { AppError } from '../../error/AppError.js';


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

