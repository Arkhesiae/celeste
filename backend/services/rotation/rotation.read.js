import Rotation from '../../models/Rotation.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { getCenterTimeZone } from '../center/center.timezone.js';

/**
 * Lecture des tours de service d'un centre, avec leur statut.
 */

const POPULATE_DAYS_AND_VARIATIONS = { path: 'days', populate: { path: 'variations' } };

/**
 * Statut d'une période d'activation : en cours, à venir ou passée. Tout se compare en jours (YYYY-MM-DD) : `today` est le jour
 * courant du centre, les activations sont des jours.
 */
const determineRotationStatus = (today, activations, index) => {
    const start = activations[index].day;
    const end = index < activations.length - 1 ? activations[index + 1].day : null;
    const bounds = { startDate: Date.parse(`${start}T00:00:00Z`), endDate: end ? Date.parse(`${end}T00:00:00Z`) : Infinity };

    if (today >= start && (end === null || today < end)) return { status: 'active', ...bounds };
    if (today < start) return { status: 'toBeActive', ...bounds };
    return { status: 'past', ...bounds };
};

/**
 * Tours de service d'un centre et leurs périodes d'activation, triées, avec le statut de chacune (« actif » : le jour courant du
 * centre, dans son fuseau, est dans la période).
 * @returns {Promise<{ allRotations: Array, sortedRotations: Array }>}
 */
export async function listRotationsWithStatus (centerId) {
    const today = todayIn(await getCenterTimeZone(centerId)).toString();   // jour courant du centre
    const rotations = await Rotation.find({ centerId, deleted: false })
        .populate(POPULATE_DAYS_AND_VARIATIONS)
        .lean();

    const expanded = rotations.flatMap((rotation) =>
        activationDaysOf(rotation).map((day) => ({
            _id: rotation._id,
            centerId: rotation.centerId,
            name: rotation.name,
            day,
            activationDate: new Date(day),   // YYYY-MM-DD = minuit UTC
        }))
    );

    const sortedRotationsActivation = expanded.sort((a, b) => new Date(a.activationDate) - new Date(b.activationDate));
    const sortedRotations = sortedRotationsActivation.map((rotation, index) => {
        const { status, startDate, endDate } = determineRotationStatus(today, sortedRotationsActivation, index);
        return {
            _id: rotation._id,
            centerId: rotation.centerId,
            name: rotation.name,
            activationDate: rotation.activationDate,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status,
        };
    });

    return { allRotations: rotations, sortedRotations };
}
