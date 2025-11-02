import Rotation from '../models/Rotation.js';
import { createNotificationForCenter } from "../utils/notificationFunctions.js";
import { findLatestRotation } from "../utils/findLatestRotation.js";
import Shift from '../models/Shift.js';
import mongoose from 'mongoose';
import Variation from '../models/Variation.js';
import Substitution from '../models/Substitution.js';
import { computeShiftOfUserWithoutSubstitutions } from '../utils/computeShiftOfUserWithSubstitutions.js';
import { getTeamAtGivenDate } from '../utils/getTeamAtGivenDate.js';
import User from '../models/User.js';
import { isValidDate, isValidId } from '../utils/validation.js';
import rotationActivationService from '../services/rotationService/rotationActivationService.js';

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
    const points = Math.floor(hours * POINTS_PER_HOUR) + BASE_VALUE;
    return { points: 10, duration: hours, endsNextDay };
};

// Determine rotation status
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

const registerShift = async (shift, order, newRotation) => {

    const existingShift = await Shift.find({ name: shift.name });

    if (existingShift) {
        for (const shift of existingShift) {
            const isShiftAlreadyInRotation = newRotation.days.some(dayId => dayId.equals(existingShift._id));
            const hasSameNameInRotation = newRotation.days.some(day => day.name === shift.name);

            if (isShiftAlreadyInRotation) {
                throw new Error(`Le shift "${shift.name}" est déjà présent dans cette rotation`);
            }
            if (hasSameNameInRotation) {
                throw new Error(`Le shift "${shift.name}" est déjà présent dans cette rotation`);
            }

        }
    }

    let points
    let endsNextDay = shift.default.endsNextDay;
    let startTime = shift.default.startTime;
    let endTime = shift.default.endTime;

    if (shift.type === 'rest') {
        points = 0;
    } else {
        if (!startTime || !endTime) {
            throw new Error('Le jour de travail doit avoir un début et une fin');
        }
        const workDuration = computeWorkDuration(startTime, endTime);

        points = workDuration.points;
    }

    const newShift = new Shift({
        name: shift.name,
        order: order,
        optional: shift.optional,
        default: {
            startTime: startTime,
            endTime: endTime,
            points: points,
            endsNextDay: endsNextDay
        },
        type: shift.type
    });

    await newShift.save();
    return newShift;
}


const registerVariation = async (variant, shift) => {
    const existingVariation = await Variation.find({ name: variant.name });

    if (existingVariation) {
        for (const variation of existingVariation) {

            const isVariationAlreadyInShift = shift.variations.some(variationId => variationId.equals(variation._id));
            const hasSameNameInShift = shift.variations.some(variation => variation.name === variant.name);
            if (isVariationAlreadyInShift) {
                throw new Error(`La variation "${variant.name}" est déjà présente dans ce shift`);
            }
            if (hasSameNameInShift) {
                throw new Error(`La variation "${variant.name}" est déjà présente dans ce shift`);
            }

        }
    }
    if (!variant.startTime || !variant.endTime) {
        throw new Error('Les variantes doivent avoir un début et une fin');
    }

    const { endsNextDay, points } = computeWorkDuration(variant.startTime, variant.endTime);


    const newVariation = new Variation({
        name: variant.name,
        startTime: variant.startTime,
        endTime: variant.endTime,
        points: points,
        endsNextDay: variant.endsNextDay
    });

    await newVariation.save();
    return newVariation;
}

// Sauvegarder un nouveau tour de service
const saveRotation = async (req, res) => {
    try {
        const rotation = req.body;

        if (!rotation.name) {
            return res.status(400).json({ message: 'Le nom du tour de service est requis' });
        }
        if (!rotation.centerId) {
            return res.status(400).json({ message: 'Le centre est requis' });
        }

        const newRotation = new Rotation({
            name: rotation.name,
            centerId: rotation.centerId,
        });

        const shifts = rotation.days;

        for (const day of shifts) {
            const order = shifts.indexOf(day) + 1;
            const shift = await registerShift(day, order, newRotation);
            newRotation.days.push(shift._id);

            // Traiter les variations si elles existent
            if (day.variations && day.variations.length > 0) {
                for (const variant of day.variations) {
                    const newVariation = await registerVariation(variant, shift);
                    shift.variations.push(newVariation._id);
                }
                await shift.save();
            }
        }

        await newRotation.save();

        res.status(201).json({ message: 'Tour de service enregistré', rotation: newRotation });
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
        const rotations = await Rotation.find({ centerId, deleted: false }).populate({
            path: 'days',
            populate: {
                path: 'variations'
            }
        });
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
        let rotations = await Rotation.find({ centerId, deleted: false })

        for (const rotation of rotations) {
            if (rotation.days.length > 0) {
                const firstDay = rotation.days[0];
                // Vérifier si les days sont déjà populés en testant si c'est un ObjectId ou un objet Shift
                if (typeof firstDay === 'string' || firstDay.constructor.name === 'ObjectId') {
                    // Les days ne sont pas populés, on les populate
                    await rotation.populate({
                        path: 'days',
                        populate: {
                            path: 'variations'
                        }
                    });
                }
                // Si c'est déjà un objet avec des propriétés de Shift, pas besoin de populate
            }
        }






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

        for (const day of result.days) {
            const shift = await Shift.findById(day);
            if (shift) {
                shift.deleted = true;
                await shift.save();
            }
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

    if (!activationDate) {
        return res.status(400).json({ message: 'Date d\'activation requise.' });
    }

    if (!isValidDate(activationDate)) {
        return res.status(400).json({ message: 'Date invalide.' });
    }

    if (!isValidId(id)) {
        return res.status(400).json({ message: 'ID de rotation invalide.' });
    }

    const rotation = await Rotation.findById(id);
    if (!rotation || rotation.deleted) {
        return res.status(404).json({ message: 'Rotation non trouvée ou supprimée.' });
    }

    try {
        const result = await rotationActivationService.updateActivationDate('add', id, activationDate);

        const status = result.needsApproval ? 409 : 200; // 409 Conflict → demande d'approbation




        return res.status(status).json({
            message: result.message,
            changes: result.changes ?? [],
            needsApproval: !!result.needsApproval
        });

    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout de la date d\'activation : ' + error.message });
    }

};

// Confirmer et appliquer une date d'activation après approbation utilisateur
const confirmAddActivationDate = async (req, res) => {
    const { id } = req.params;
    const { activationDate } = req.body;

    if (!activationDate) {
        return res.status(400).json({ message: 'Date d\'activation requise.' });
    }

    if (!isValidDate(activationDate)) {
        return res.status(400).json({ message: 'Date invalide.' });
    }

    if (!isValidId(id)) {
        return res.status(400).json({ message: 'ID de rotation invalide.' });
    }

    const rotation = await Rotation.findById(id);
    if (!rotation || rotation.deleted) {
        return res.status(404).json({ message: 'Rotation non trouvée ou supprimée.' });
    }

    try {
        const result = await rotationActivationService.confirmAddActivationDate(id, activationDate);
        return res.status(200).json({ message: result.message, changes: result.changes });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la confirmation de la date d\'activation : ' + error.message });
    }
};

// Supprimer une date d'activation
const removeActivationDate = async (req, res) => {
    const { id } = req.params;
    const { activationDate } = req.body;


    if (!activationDate) {
        return res.status(400).json({ message: 'Date d\'activation requise.' });
    }

    if (!isValidDate(activationDate)) {
        return res.status(400).json({ message: 'Date invalide.' });
    }

    if (!isValidId(id)) {
        return res.status(400).json({ message: 'ID de rotation invalide.' });
    }

    const rotation = await Rotation.findById(id);
    if (!rotation || rotation.deleted) {
        return res.status(404).json({ message: 'Rotation non trouvée ou supprimée.' });
    }

    try {
        const result = await rotationActivationService.updateActivationDate('remove', id, activationDate);

        const status = result.needsApproval ? 409 : 200; // 409 Conflict → demande d'approbation


        return res.status(status).json({
            message: result.message,
            changes: result.changes ?? [],
            needsApproval: !!result.needsApproval
        });

    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de l\'ajout de la date d\'activation : ' + error.message });
    }

};

// Confirmer et appliquer une date d'activation après approbation utilisateur
const confirmRemoveActivationDate = async (req, res) => {
    const { id } = req.params;
    const { activationDate } = req.body;

    console.log('confirmRemoveActivationDate', id, activationDate);

    if (!activationDate) {
        return res.status(400).json({ message: 'Date d\'activation requise.' });
    }

    if (!isValidDate(activationDate)) {
        return res.status(400).json({ message: 'Date invalide.' });
    }

    if (!isValidId(id)) {
        return res.status(400).json({ message: 'ID de rotation invalide.' });
    }

    const rotation = await Rotation.findById(id);
    if (!rotation || rotation.deleted) {
        return res.status(404).json({ message: 'Rotation non trouvée ou supprimée.' });
    }

    try {
        const result = await rotationActivationService.confirmRemoveActivationDate(id, activationDate);
        return res.status(200).json({ message: result.message, changes: result.changes });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la confirmation de la suppression de la date d\'activation : ' + error.message });
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


        const shift = await Shift.findById(updatedDay._id);
        if (!shift) {
            return res.status(400).json({ message: 'Jour non trouvé' });
        }

        const isDayInRotation = rotation.days.some(day => day._id.equals(shift._id));
        if (!isDayInRotation) {
            return res.status(400).json({ message: 'Jour non trouvé dans la rotation' });
        }

        console.log("updatedDay", updatedDay);

        if (updatedDay.type !== 'rest') {
            if (!updatedDay.default.startTime || !updatedDay.default.endTime) {
                throw new Error('Le jour de travail doit avoir un début et une fin');
            }
            const { points } = computeWorkDuration(updatedDay.default.startTime, updatedDay.default.endTime);

            shift.default = updatedDay.default;
            shift.default.points = points;
            shift.type = updatedDay.type;
            shift.optional = updatedDay.optional;
            shift.name = updatedDay.name;
            shift.order = updatedDay.order;

            shift.variations = [];



            const newVariationList = [];
            if (updatedDay.variations && updatedDay.variations.length > 0) {
                for (const updatedVariation of updatedDay.variations) {
                    const variation = await Variation.findById(updatedVariation._id);
                    if (variation) {
                        if (!updatedVariation.startTime || !updatedVariation.endTime) {
                            throw new Error('Les variantes doivent avoir un début et une fin');
                        }
                        const { points } = computeWorkDuration(updatedVariation.startTime, updatedVariation.endTime);

                        variation.name = updatedVariation.name;
                        variation.startTime = updatedVariation.startTime;
                        variation.endTime = updatedVariation.endTime;
                        variation.endsNextDay = updatedVariation.endsNextDay;
                        variation.points = points;

                        shift.variations.push(variation._id);
                        newVariationList.push(variation);
                        await variation.save();
                    } else {
                        const newVariation = await registerVariation(updatedVariation, shift);
                        shift.variations.push(newVariation._id);
                        await newVariation.save();



                    }

                }

                await Variation.deleteMany({ _id: { $nin: newVariationList.map(v => v._id), $in: shift.variations } });

            }
            await shift.save();

        }

        // Mettre à jour le jour spécifique


        res.json({
            message: 'Jour mis à jour avec succès', rotation: await rotation.populate({
                path: 'days',
                populate: {
                    path: 'variations'
                }
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Dupliquer une rotation
const duplicateRotation = async (req, res) => {
    const { id } = req.params;

    try {

        const rotation = await Rotation.findById(id)
            .populate({
                path: 'days',
                populate: {
                    path: 'variations'
                }
            });


        if (!rotation) {
            return res.status(404).json({ message: 'Tour de service non trouvé' });
        }

        // Créer une copie de la rotation
        const duplicatedRotation = new Rotation({
            name: `${rotation.name} (copie)`,
            days: [], // On va remplir avec les nouveaux IDs
            centerId: rotation.centerId,
            activationDates: [], // La copie commence sans dates d'activation
        });

        await duplicatedRotation.save();


        for (const day of rotation.days) {

            // Créer une copie du shift
            if (!day.order) {
                day.order = rotation.days.indexOf(day) + 1;
            }

            const shiftData = {
                name: day.name,
                variations: [],
                order: day.order,
                optional: day.optional ? day.optional : false,
                default: {
                    startTime: day.default.startTime || null,
                    endTime: day.default.endTime || null,
                    points: day.default.points || 0,
                    endsNextDay: day.default.endsNextDay || false
                },
                type: day.type
            }

            const existingShift = await Shift.findById(day._id);

            // if (!existingShift && format === 'legacy') {
            //     shiftData._id = day._id;
            // }


            const newShift = new Shift(shiftData);

            duplicatedRotation.days.push(newShift._id);
            // Dupliquer les variations si elles existent




            if (day.variations && day.variations.length > 0) {
                for (const variant of day.variations) {
                    const newVariation = new Variation({
                        name: variant.name,
                        startTime: variant.startTime,
                        endTime: variant.endTime,
                        points: variant.points,
                        endsNextDay: variant.endsNextDay
                    });

                    await newVariation.save();
                    newShift.variations.push(newVariation._id);
                }
            }

            await newShift.save();

        }


        await duplicatedRotation.save();


        res.status(201).json({
            message: 'Tour de service dupliqué avec succès',
            rotation: duplicatedRotation
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la duplication du tour de service', error: error.message });
    }
};

// Mettre à jour une rotation
const updateRotation = async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;

    try {
        const rotation = await Rotation.findById(id).populate('days');
        if (!rotation) {
            return res.status(404).json({ message: 'Tour de service non trouvé' });
        }

        // Mettre à jour les champs autorisés
        if (updatedData.name) {
            rotation.name = updatedData.name;
        }

        if (updatedData.centerId) {
            rotation.centerId = updatedData.centerId;
        }

        if (updatedData.activationDates) {
            rotation.activationDates = updatedData.activationDates;
        }

        // // Mettre à jour les jours (shifts) si fournis
        if (updatedData.days) {
            console.log("updatedData.days", updatedData.days);
            // Supprimer les anciens shifts et leurs variations
            // for (const oldShift of rotation.days) {
            //     if (oldShift.variations && oldShift.variations.length > 0) {
            //         await Variation.deleteMany({ _id: { $in: oldShift.variations } });
            //     }
            //     await Shift.findByIdAndDelete(oldShift._id);
            // }

            // Créer les nouveaux shifts
            // rotation.days = [];
            // for (const dayData of updatedData.days) {
            //     const order = updatedData.days.indexOf(dayData) + 1;

            //     // Créer le nouveau shift
            //     const newShift = await registerShift(dayData, order, rotation);
            //     rotation.days.push(newShift._id);

            //     // Traiter les variations si elles existent
            //     if (dayData.variations && dayData.variations.length > 0) {
            //         for (const variantData of dayData.variations) {
            //             const newVariation = await registerVariation(variantData, newShift);
            //             newShift.variations.push(newVariation._id);
            //             await newVariation.save();
            //         }
            //         await newShift.save();
            //     }
            // }
        }

        // Sauvegarder les modifications
        const updatedRotation = await rotation.save();

        // Populer les données pour la réponse
        const populatedRotation = await Rotation.findById(updatedRotation._id)
            .populate({
                path: 'days',
                populate: {
                    path: 'variations'
                }
            });

        res.json({
            message: 'Tour de service mis à jour avec succès',
            rotation: populatedRotation
        });
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la rotation:', error);
        res.status(500).json({ message: error.message });
    }
};

export default {
    saveRotation,
    getAllRotations,
    getRotationsByCenter,
    getAllRotationsWithStatus,
    getActiveRotationAtDate,
    confirmRemoveActivationDate,
    confirmAddActivationDate,
    deleteRotation,
    addActivationDate,
    removeActivationDate,
    updateDayInRotation,
    duplicateRotation,
    updateRotation,
}; 