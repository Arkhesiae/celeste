import User from '../../models/User.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import { toPlainDate } from '../../utils/dates/plainDate.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import Substitution from '../../models/Substitution.js';
import { findLatestRotation } from '../rotation/rotation.latest.js';
import { generateShiftsMap } from '../planning/planning.shiftsMap.js';
import { shiftMapToArray } from '../planning/planning.shiftsMap.js';
import { legalLimitsFor } from './compatibility/categorizeDemand.js';
import { getCenterTimeZone } from '../center/center.timezone.js';
import Rotation from '../../models/Rotation.js';
import { AppError } from '../../error/AppError.js';


const verifyCompatibilities = async (demands, userId) => {
    const list = [];
    for (const demand of demands) {
        const result = demand.toObject();
        const data = await getCompatibleSwitches(posterDayOf(result), userId);
        const incompatibleSwitches = data.filter(s => !s.compatible);
        result.incompatibleSwitches = [];
        for (const acceptedSwitch of result.acceptedSwitches) {
            if (incompatibleSwitches.some(i => sameId(i._id, acceptedSwitch.shift._id))) {
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
    // Jour demandé sous forme de clé YYYY-MM-DD (pas de Date) : tout le calcul qui suit raisonne en jours
    const demandDay = toPlainDate(date)?.toString();
    if (!demandDay) {
        throw new AppError('Date invalide', 400);
    }
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const timeZone = await getCenterTimeZone(user.centerId);   // fuseau de toutes les vacations de cet utilisateur
    const activeRotation = await findLatestRotation(user.centerId, demandDay);
    if (!activeRotation) {
        throw new AppError('Tour de service actif non trouvé', 404);
    }

    const populateRotation = await Rotation.findById(activeRotation._id).populate('days');

    // Planning réel de l'utilisateur autour du jour demandé (±12 jours, vacations travaillées seulement)
    const shiftMap = await generateShiftsMap([demandDay], userId);

    const shifts = []
    for (const day of populateRotation.days) {
        if (day.type === 'rest') continue;
        const localMap = new Map(shiftMap);


        // La vacation candidate (un jour de la rotation) est posée à la date demandée, à la place de ce que
        // l'utilisateur y faisait, avec ses horaires par défaut (les variantes ne sont pas évaluées, #45)
        const dayData = {
            shift: day,
            date: demandDay,
            startTime: day.default.startTime,
            endTime: day.default.endTime,
            endsNextDay: day.default.endsNextDay ?? false,
        };

        localMap.set(demandDay, dayData);
        const shiftsSorted = shiftMapToArray(localMap);
        // Mêmes règles légales que pour une demande (repos 11h / 35h, charge 48h, 5 jours, nuits)
        const { limit: dayLimit } = legalLimitsFor(demandDay, shiftsSorted, timeZone);
        const compatible = dayLimit.length === 0;

        // Les jours de référence sont ceux du tour de service actif à cette date : le front les affiche tels quels
        shifts.push({
            _id: day._id,
            name: day.name,
            order: day.order,
            startTime: day.default?.startTime,
            endTime: day.default?.endTime,
            endsNextDay: day.default?.endsNextDay ?? false,
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

