import Rotation from '../models/Rotation.js';
import { createNotificationForCenter } from "../utils/notificationFunctions.js";
import { findLatestRotation } from "../utils/findLatestRotation.js";

const POINTS_PER_HOUR = 1;
const BASE_VALUE = 2;

// Helper function to compute work duration
const computeWorkDuration = (start, end) => {
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    let endsNextDay = false;
    let startDate = new Date();
    startDate.setHours(startHour, startMinute);
    let endDate = new Date();
    endDate.setHours(endHour, endMinute);

    if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
        endsNextDay = true;
    }
    const durationInMillis = endDate - startDate;
    const hours = Math.floor(durationInMillis / 3600000);
    return { points: Math.floor(hours * POINTS_PER_HOUR) + BASE_VALUE, duration: hours, endsNextDay };
};

// Determine rotation status
const determineRotationStatus = (currentDate, shiftsActivation, currentActivationDateIndex) => {
    const now = currentDate.getTime();
    const start = new Date(shiftsActivation[currentActivationDateIndex].activationDate).getTime();
    const end = currentActivationDateIndex < shiftsActivation.length - 1
        ? new Date(shiftsActivation[currentActivationDateIndex + 1].activationDate).getTime()
        : Infinity;

    if (now >= start && now < end) {
        return 'active';
    } else if (now < start) {
        return 'toBeActive';
    } else {
        return 'past';
    }
};

// Sauvegarder un nouveau tour de service
const saveRotation = async (req, res) => {
    try {
        const rotation = req.body;
        rotation.days.forEach((day) => {
            if (day.type !== 'rest') {
                if (day.startTime && day.endTime) {
                    day.endsNextDay = computeWorkDuration(day.startTime, day.endTime).endsNextDay;
                }
                
                    day.defaultPoints = computeWorkDuration(day.startTime, day.endTime).points;
                    day.defaultPoints = 10
                
            }
            if (day.variants) {
                day.variants.forEach((variant) => {
                    variant.defaultPoints = computeWorkDuration(variant.startTime, variant.endTime).points;
                    variant.defaultPoints = 10
                });
            }
        });
        
        const newRotation = new Rotation({
            name: rotation.name,
            centerId: rotation.centerId,
            days: rotation.days,
        });

        await newRotation.save();
        res.status(201).json({ message: 'Tour de service sauvegardé avec succès', rotation: newRotation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtenir tous les tours de service
const getAllRotations = async (req, res) => {
    try {
        const rotations = await Rotation.find();
        res.json(rotations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtenir les tours de service d'un centre spécifique
const getRotationsByCenter = async (req, res) => {
    const { centerId } = req.params;

    try {
        const rotations = await Rotation.find({ centerId, deleted: false });
        if (!rotations.length) {
            return res.status(404).json({ message: 'Aucun tour de service trouvé' });
        }
        res.json(rotations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtenir tous les tours de service avec leur statut
const getAllRotationsWithStatus = async (req, res) => {
    const { centerId } = req.params;

    try {
        const currentDate = new Date();
        const rotations = await Rotation.find({ centerId, deleted: false });

        const expanded = rotations.flatMap((rotation) =>
            rotation.activationDates.map((date) => ({
                _id: rotation._id,
                centerId: rotation.centerId,
                name: rotation.name,
                activationDate: new Date(date),
            }))
        );

        const sortedRotationsActivation = expanded.sort((a, b) => new Date(a.activationDate) - new Date(b.activationDate));
        const response = sortedRotationsActivation.map((rotation, index) => {
            const status = determineRotationStatus(currentDate, sortedRotationsActivation, index);
            return {
                _id: rotation._id,
                centerId: rotation.centerId,
                name: rotation.name,
                activationDate: rotation.activationDate,
                status,
            };
        });

        res.json({ allRotations: rotations, sortedRotations: response });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtenir le tour de service actif à une date donnée
const getActiveRotationAtDate = async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const rotations = await findLatestRotation(req.centerId, date);
        res.json(rotations[0] || null);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer un tour de service
const deleteRotation = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await Rotation.findById(id);
        if (!result) {
            return res.status(404).json({ message: 'Rotation not found' });
        }

        const currentDate = new Date();
        const lastActiveRotation = await Rotation.aggregate([
            { $match: { deleted: false } },
            { $unwind: '$activationDates' },
            { $match: { activationDates: { $lte: currentDate } } },
            { $sort: { activationDates: -1 } },
            { $limit: 1 },
        ]);

        if (lastActiveRotation.length > 0 && lastActiveRotation[0]._id.equals(result._id)) {
            return res.status(400).json({ 
                message: "Vous ne pouvez pas supprimer le tour de service actif",
                type: 'ActiveRotation'
            });
        }

        const hasFutureActivations = result.activationDates.some(date => new Date(date) > currentDate)

        if (hasFutureActivations) {
            return res.status(400).json({ 
                message: 'Le tour de service ne peut pas être supprimé car il reste des activations',
                type: 'RemainingOccurences'
            });
        }

        result.deleted = true;
        await result.save();
        res.json({ message: 'Rotation deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Ajouter une date d'activation
const addActivationDate = async (req, res) => {
    const { id } = req.params;
    const { activationDate } = req.body;

    try {
        if (!activationDate) {
            return res.status(400).json({ message: 'Activation date is required.' });
        }

        const rotation = await Rotation.findById(id);
        if (!rotation) {
            return res.status(404).json({ message: 'Rotation not found.' });
        }

        const updatedRotation = await Rotation.findByIdAndUpdate(
            id,
            { $addToSet: { activationDates: activationDate } },
            { new: true, runValidators: true }
        );

        if (!updatedRotation) {
            return res.status(404).json({ message: 'Rotation not found.' });
        }

        await createNotificationForCenter({message: "Le tour de service : " + updatedRotation.name + " sera actif à partir du " + activationDate, title: "Changement de tour de service"}, 'general', updatedRotation.centerId);

        res.json({ message: 'Activation date added successfully.', rotation: updatedRotation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Supprimer une date d'activation
const removeActivationDate = async (req, res) => {
    const { id } = req.params;
    const { activationDate } = req.body;

    try {
        if (!activationDate) {
            return res.status(400).json({ message: 'Activation date is required.' });
        }

        const updatedRotation = await Rotation.findByIdAndUpdate(
            id,
            { $pull: { activationDates: activationDate } },
            { new: true }
        );

        if (!updatedRotation) {
            return res.status(404).json({ message: 'Rotation not found' });
        }

        res.json({ message: 'Activation date removed', rotation: updatedRotation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour un jour dans une rotation
const updateDayInRotation = async (req, res) => {
    const { id } = req.params;
    const { updatedDay } = req.body;
    
    try {
        const rotation = await Rotation.findById(id);
        if (!rotation) {
            return res.status(404).json({ message: 'Tour de service non trouvé' });
        }

        if (!rotation.days.some(day => day._id.equals(updatedDay._id))) {
            return res.status(400).json({ message: 'Jour non trouvé dans la rotation' });
        }

        // Calculer endsNextDay et defaultPoints si c'est un jour de travail
        if (updatedDay.type !== 'rest') {
            if (updatedDay.startTime && updatedDay.endTime) {
                const { endsNextDay, points } = computeWorkDuration(updatedDay.startTime, updatedDay.endTime);
                updatedDay.endsNextDay = endsNextDay;
                updatedDay.defaultPoints = points;
                updatedDay.defaultPoints = 10
            }
            if (updatedDay.variants) {
                updatedDay.variants.forEach((variant) => {
                    variant.defaultPoints = computeWorkDuration(variant.startTime, variant.endTime).points;
                    variant.defaultPoints = 10
                });
            }
        }

        // Mettre à jour le jour spécifique
        rotation.days[rotation.days.findIndex(day => day._id.equals(updatedDay._id))] = updatedDay;
        await rotation.save();

        res.json({ message: 'Jour mis à jour avec succès', rotation });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Dupliquer une rotation
const duplicateRotation = async (req, res) => {
    const { id } = req.params;

    try {
        const rotation = await Rotation.findById(id);
        if (!rotation) {
            return res.status(404).json({ message: 'Tour de service non trouvé' });
        }

        // Créer une copie de la rotation
        const duplicatedRotation = new Rotation({
            name: `${rotation.name} (copie)`,
            days: rotation.days,
            centerId: rotation.centerId,
            activationDates: [], // La copie commence sans dates d'activation
        });

        await duplicatedRotation.save();

        // Créer une notification pour le centre
        await createNotificationForCenter(
            {
                message: `Le tour de service "${duplicatedRotation.name}" a été créé`,
                title: "Nouveau tour de service"
            },
            'general',
            rotation.centerId
        );

        res.status(201).json({ 
            message: 'Tour de service dupliqué avec succès', 
            rotation: duplicatedRotation 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Mettre à jour une rotation
const updateRotation = async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;

    try {
        const rotation = await Rotation.findById(id);
        if (!rotation) {
            return res.status(404).json({ message: 'Tour de service non trouvé' });
        }

        // Mettre à jour les champs autorisés
        if (updatedData.name) {
            rotation.name = updatedData.name;
        }
        if (updatedData.days) {
            updatedData.days.forEach((day) => {
                if (day.type !== 'rest') {
                    if (day.startTime && day.endTime) {
                        day.defaultPoints = computeWorkDuration(day.startTime, day.endTime).points;
                        day.defaultPoints = 10
                    }
                }
                if (day.variants) {
                    day.variants.forEach((variant) => {
                        variant.defaultPoints = computeWorkDuration(variant.startTime, variant.endTime).points;
                        variant.defaultPoints = 10
                    });
                }
            });
            rotation.days = updatedData.days;
        }
        if (updatedData.activationDates) {
            rotation.activationDates = updatedData.activationDates;
        }
        if (updatedData.centerId) {
            rotation.centerId = updatedData.centerId;
        }

        // Sauvegarder les modifications
        const updatedRotation = await rotation.save();

        res.json({ 
            message: 'Tour de service mis à jour avec succès', 
            rotation: updatedRotation 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default {
    saveRotation,
    getAllRotations,
    getRotationsByCenter,
    getAllRotationsWithStatus,
    getActiveRotationAtDate,
    deleteRotation,
    addActivationDate,
    removeActivationDate,
    updateDayInRotation,
    duplicateRotation,
    updateRotation,
}; 