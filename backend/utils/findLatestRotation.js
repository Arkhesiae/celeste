const  Rotation  = require('../models/rotationModel');

const findLatestRotation = async (centerId, date = new Date()) => {
    const dateTimestamp = new Date(date);

    const rotations = await Rotation.aggregate([
        { $match: { centerId, deleted : false } }, // Filtrer sur le centre
        { $unwind: '$activationDates' }, // Exploser les dates d'activation
        { $match: { activationDates: { $lte: dateTimestamp } } }, // Garder les dates <= à la date demandée
        { $sort: { activationDates: -1 } }, // Trier par date décroissante
        { $limit: 1 } // Prendre seulement le plus récent
    ]);

    return rotations[0] || null;
};

module.exports = { findLatestRotation };
