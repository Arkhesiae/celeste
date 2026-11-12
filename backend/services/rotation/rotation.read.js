import Rotation from '../../models/Rotation.js';
import { activationDaysOf } from '../../utils/dates/dayAccess.js';
import { AppError } from '../../error/AppError.js';
import { findLatestRotation } from './rotation.latest.js';

/**
 * Lecture des tours de service : liste, par centre, avec leur statut, et tour actif à une date.
 */

const POPULATE_DAYS_AND_VARIATIONS = { path: 'days', populate: { path: 'variations' } };

/** Tous les tours de service (tous centres) */
export const listRotations = () => Rotation.find();

/** Tours de service d'un centre, jours et variantes compris ; 404 s'il n'y en a aucun */
export async function listRotationsOfCenter (centerId) {
    const rotations = await Rotation.find({ centerId, deleted: false }).populate(POPULATE_DAYS_AND_VARIATIONS);
    if (!rotations.length) {
        throw new AppError('Aucun tour de service trouvé', 404);
    }
    return rotations;
}

/** Statut d'une période d'activation : en cours, à venir ou passée */
const determineRotationStatus = (currentDate, shiftsActivation, currentActivationDateIndex) => {
    const now = currentDate.getTime();
    const start = new Date(shiftsActivation[currentActivationDateIndex].activationDate).getTime();
    const end = currentActivationDateIndex < shiftsActivation.length - 1
        ? new Date(shiftsActivation[currentActivationDateIndex + 1].activationDate).getTime()
        : Infinity;

    if (now >= start && now < end) {
        return { status: 'active', startDate: start, endDate: end };
    } else if (now < start) {
        return { status: 'toBeActive', startDate: start, endDate: end };
    } else {
        return { status: 'past', startDate: start, endDate: end };
    }
};

/**
 * Tours de service d'un centre et leurs périodes d'activation, triées, avec le statut de chacune.
 * @returns {Promise<{ allRotations: Array, sortedRotations: Array }>}
 */
export async function listRotationsWithStatus (centerId) {
    const currentDate = new Date();
    const rotations = await Rotation.find({ centerId, deleted: false })
        .populate(POPULATE_DAYS_AND_VARIATIONS)
        .lean();

    const expanded = rotations.flatMap((rotation) =>
        activationDaysOf(rotation).map((day) => ({
            _id: rotation._id,
            centerId: rotation.centerId,
            name: rotation.name,
            activationDate: new Date(day),   // YYYY-MM-DD = minuit UTC
        }))
    );

    const sortedRotationsActivation = expanded.sort((a, b) => new Date(a.activationDate) - new Date(b.activationDate));
    const sortedRotations = sortedRotationsActivation.map((rotation, index) => {
        const { status, startDate, endDate } = determineRotationStatus(currentDate, sortedRotationsActivation, index);
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

/** Tour de service actif d'un centre à une date (known issue #36 : le résultat de `findLatestRotation` n'est pas un tableau) */
export async function getActiveRotationAtDate (centerId, date) {
    const rotations = await findLatestRotation(centerId, date);
    return rotations[0] || null;
}
