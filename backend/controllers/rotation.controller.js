import Rotation from '../models/Rotation.js';
import { findLatestRotation } from "../utils/findLatestRotation.js";
import Shift from '../models/Shift.js';
import Variation from '../models/Variation.js';
import { isValidDate, isValidId } from '../utils/validation.js';
import rotationActivationService from '../services/rotationService/rotationActivationService.js';
import { AppError } from '../error/AppError.js';
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
                throw new AppError(`Le shift "${shift.name}" est déjà présent dans cette rotation`, 400);
            }
            if (hasSameNameInRotation) {
                throw new AppError(`Le shift "${shift.name}" est déjà présent dans cette rotation`, 400);
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
            throw new AppError('Le jour de travail doit avoir un début et une fin', 400);
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
                throw new AppError(`La variation "${variant.name}" est déjà présente dans ce shift`, 400);
            }
            if (hasSameNameInShift) {
                throw new AppError(`La variation "${variant.name}" est déjà présente dans ce shift`, 400);
            }

        }
    }
    if (!variant.startTime || !variant.endTime) {
        throw new AppError('Les variantes doivent avoir un début et une fin', 400);
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
const saveRotation = async (req, res, next) => {
    try {
        const rotation = req.body;

        if (!rotation.name) {
            throw new AppError('Le nom du tour de service est requis', 400);
        }
        if (!rotation.centerId) {
            throw new AppError('Le centre est requis', 400);
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
        next(error);
    }
};

// Obtenir tous les tours de service
const getAllRotations = async (req, res, next) => {
    try {
        const rotations = await Rotation.find();
        res.json(rotations);
    } catch (error) {
        next(error);
    }
};

// Obtenir les tours de service d'un centre spécifique
const getRotationsByCenter = async (req, res, next) => {
    const { centerId } = req.params;

    try {
        const rotations = await Rotation.find({ centerId, deleted: false }).populate({
            path: 'days',
            populate: {
                path: 'variations'
            }
        });
        if (!rotations.length) {
            throw new AppError('Aucun tour de service trouvé', 404);
        }
        res.json(rotations);
    } catch (error) {
        next(error);
    }
};

// Obtenir tous les tours de service avec leur statut
const getAllRotationsWithStatus = async (req, res, next) => {
    const { centerId } = req.params;

    try {
        const currentDate = new Date();
        const rotations = await Rotation.find({ centerId, deleted: false })
            .populate({
                path: 'days',
                populate: { path: 'variations' }
            })
            .lean();






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
        next(error);
    }
};

// Obtenir le tour de service actif à une date donnée
const getActiveRotationAtDate = async (req, res, next) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const rotations = await findLatestRotation(req.centerId, date);
        res.json(rotations[0] || null);
    } catch (err) {
        next(err);
    }
};

// Supprimer un tour de service
const deleteRotation = async (req, res, next) => {
    const { id } = req.params;

    try {
        const result = await Rotation.findById(id);
        if (!result) {
            throw new AppError('Rotation non trouvée.', 404);
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
            throw new AppError('Le tour de service ne peut pas être supprimé car il est actif.', 400, 'ActiveRotation');
        }

        const hasFutureActivations = result.activationDates.some(date => new Date(date) > currentDate)

        if (hasFutureActivations) {
            throw new AppError('Le tour de service ne peut pas être supprimé car il reste des activations.', 400, 'RemainingOccurences');
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
        res.json({ message: 'Rotation supprimée avec succès' });
    } catch (err) {
        next(err);
    }
};

// Validation commune, factorisée pour éviter la duplication entre les 4 handlers d'origine
const validateActivationRequest = async (id, activationDate) => {
    if (!activationDate) {
        throw new AppError('Date d\'activation requise.', 400);
    }
    if (!isValidDate(activationDate)) {
        throw new AppError('Date invalide.', 400);
    }
    if (!isValidId(id)) {
        throw new AppError('ID de rotation invalide.', 400);
    }

    const rotation = await Rotation.findById(id);
    if (!rotation || rotation.deleted) {
        throw new AppError('Rotation non trouvée ou supprimée.', 404)
    }

    return { rotation };
};

// Ajouter (ou prévisualiser l'ajout d') une date d'activation
const addActivationDate = async (req, res, next) => {
    const { id } = req.params;
    const { activationDate } = req.body;
    const confirmed = req.body.confirmed === true;

    console.log("rotation.controller.js::addActivationDate: id", id);

    await validateActivationRequest(id, activationDate);

    console.log('confirmed', confirmed)

    try {
        const result = await rotationActivationService.updateActivationDate('add', id, activationDate, confirmed);

        const status = result.needsApproval ? 409 : 200; // 409 Conflict → demande d'approbation

        return res.status(status).json({
            message: result.message,
            changes: result.changes ?? [],
            needsApproval: !!result.needsApproval
        });

    } catch (err) {
        next(err);
    }
};

// Supprimer (ou prévisualiser la suppression d') une date d'activation
const removeActivationDate = async (req, res, next) => {
    const { id } = req.params;
    const { activationDate } = req.body;
    const confirmed = req.body.confirmed === true;

    await validateActivationRequest(id, activationDate);

    try {
        const result = await rotationActivationService.updateActivationDate('remove', id, activationDate, confirmed);

        const status = result.needsApproval ? 409 : 200; // 409 Conflict → demande d'approbation

        return res.status(status).json({
            message: result.message,
            changes: result.changes ?? [],
            needsApproval: !!result.needsApproval
        });

    } catch (err) {
        next(err);
    }
};


// Mettre à jour un jour dans une rotation
const updateDayInRotation = async (req, res, next) => {
    const { id } = req.params;
    const { updatedDay } = req.body;

    try {
        const rotation = await Rotation.findById(id);
        if (!rotation) {
            throw new AppError('Tour de service non trouvé', 404);
        }

        // Un jour n'est modifiable que tant que le tour n'a jamais été (ni ne sera) activé : sinon la modification
        // changerait rétroactivement le planning et les demandes déjà passées ou à venir.
        if (rotation.activationDates?.length > 0) {
            throw new AppError("Ce tour de service a des dates d'activation (passées ou à venir) : ses jours ne sont plus modifiables. Supprimez ses dates d'activation ou dupliquez-le pour le modifier.", 400, 'ROTATION_HAS_ACTIVATIONS');
        }

        const shift = await Shift.findById(updatedDay._id);
        if (!shift) {
            throw new AppError('Jour non trouvé', 400);
        }

        const isDayInRotation = rotation.days.some(day => day._id.equals(shift._id));
        if (!isDayInRotation) {
            throw new AppError('Jour non trouvé dans la rotation', 400);
        }

        console.log("updatedDay", updatedDay);

        if (updatedDay.type !== 'rest') {
            if (!updatedDay.default.startTime || !updatedDay.default.endTime) {
                throw new AppError('Le jour de travail doit avoir un début et une fin', 400);
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
                            throw new AppError('Les variantes doivent avoir un début et une fin', 400);
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
        next(error);
    }
};

// Dupliquer une rotation
const duplicateRotation = async (req, res, next) => {
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
            throw new AppError('Tour de service non trouvé', 404);
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
        next(error);
    }
};

// Mettre à jour une rotation
const updateRotation = async (req, res, next) => {
    const { id } = req.params;
    const updatedData = req.body;

    try {
        const rotation = await Rotation.findById(id).populate('days');
        if (!rotation) {
            throw new AppError('Tour de service non trouvé', 404);
        }

        // Mettre à jour les champs autorisés
        if (updatedData.name) {
            rotation.name = updatedData.name;
        }

        // `centerId` et `activationDates` ne sont volontairement pas modifiables ici : changer de centre ou
        // d'activation passe par les routes d'activation (aperçu, approbation, conversion des demandes).

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
        next(error);
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