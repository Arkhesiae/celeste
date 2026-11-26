import User from '../../models/User.js';
import { posterDayOf } from '../../utils/dates/dayAccess.js';
import { findOrThrow } from '../../utils/mongo.js';
import { sameId } from '../../utils/ids.js';
import Demand from '../../models/Demand.js';
import { findLatestRotation } from '../rotation/rotation.timeline.js';
import { generateShiftsMap } from '../planning/planning.shiftsMap.js';
import { shiftMapToArray } from '../planning/planning.shiftsMap.js';
import { legalLimitsFor } from './compatibility/compatibility.rules.js';
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

/**
 * Pour chaque vacation de travail du tour de service actif ce jour-là : peut-on la prendre à la place de ce que fait l'utilisateur
 * ce jour (horaires par défaut et chaque variante) ?
 * @param {string} demandDay - jour demandé, au format `YYYY-MM-DD` : le format est contrôlé par l'appelant (le contrôleur), pas converti ici
 * @param {string} userId
 */
export async function getCompatibleSwitches (demandDay, userId) {
    const user = await findOrThrow(User, userId, { message: 'Utilisateur non trouvé' });
    const timeZone = await getCenterTimeZone(user.centerId);   // fuseau de toutes les vacations de cet utilisateur
    const activeRotation = await findLatestRotation(user.centerId, demandDay);
    if (!activeRotation) {
        throw new AppError('Tour de service actif non trouvé', 404);
    }

    // Les jours du tour de service avec leurs variantes : chacune est évaluée (#45)
    const populateRotation = await Rotation.findById(activeRotation._id).populate({ path: 'days', populate: { path: 'variations' } });

    // Planning réel de l'utilisateur autour du jour demandé (±12 jours, vacations travaillées seulement)
    const shiftMap = await generateShiftsMap([demandDay], userId);

    // Évalue une vacation candidate posée à la date demandée, à la place de ce que l'utilisateur y faisait, avec les mêmes règles
    // légales que pour une demande (repos 11h / 35h, charge 48h, 5 jours, nuits). La variante que l'utilisateur a choisie pour la
    // vacation qu'il cède n'intervient pas : cette vacation disparaît, remplacée par la candidate. Seuls comptent ses autres
    // jours, avec leurs horaires réels.
    const evaluate = (shift, hours, selectedVariation = null) => {
        const localMap = new Map(shiftMap);
        localMap.set(demandDay, {
            shift,
            date: demandDay,
            startTime: hours.startTime,
            endTime: hours.endTime,
            endsNextDay: hours.endsNextDay ?? false,
            selectedVariation,
        });
        const { limit } = legalLimitsFor(demandDay, shiftMapToArray(localMap), timeZone);
        return { limit, compatible: limit.length === 0 };
    };

    const shifts = []
    for (const day of populateRotation.days) {
        if (day.type === 'rest') continue;

        // Les jours de référence sont ceux du tour de service actif à cette date : le front les affiche tels quels.
        // `limit` / `compatible` valent pour les horaires par défaut ; `variations` donne le résultat de chaque variante,
        // pour montrer celles qui passent même quand la vacation par défaut est refusée.
        shifts.push({
            _id: day._id,
            name: day.name,
            order: day.order,
            startTime: day.default?.startTime,
            endTime: day.default?.endTime,
            endsNextDay: day.default?.endsNextDay ?? false,
            ...evaluate(day, day.default),
            variations: (day.variations ?? [])
                .filter((variation) => variation.startTime && variation.endTime)
                .map((variation) => ({
                    _id: variation._id,
                    name: variation.name,
                    startTime: variation.startTime,
                    endTime: variation.endTime,
                    endsNextDay: variation.endsNextDay ?? false,
                    ...evaluate(day, variation, variation),
                })),
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

    const demand = await Demand.findByIdAndUpdate(
        demandId,
        { $addToSet: { consultedBy: userId } },
        { new: true }
    );

    if (!demand) {
        throw new AppError('Demande non trouvée', 404);
    }

    return demand;
}

