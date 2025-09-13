import Rotation from '../models/Rotation.js';

const findLatestRotation = async (centerId, date = new Date()) => {
    const dateTimestamp = new Date(date);
    if (!centerId) {
        throw new Error('Center ID is required');
    }

    const rotations = await Rotation.aggregate([
        { $match: { centerId, deleted : false } }, // Filtrer sur le centre
        { $unwind: '$activationDates' }, // Exploser les dates d'activation
        { $match: { activationDates: { $lte: dateTimestamp } } }, // Garder les dates <= à la date demandée
        { $sort: { activationDates: -1 } }, // Trier par date décroissante
        { $limit: 1 } // Prendre seulement le plus récent
    ]);

    return rotations[0] || null;
};

export { findLatestRotation };
