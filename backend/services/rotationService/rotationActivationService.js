import Rotation from '../../models/Rotation.js';
import Shift from '../../models/Shift.js';
import Substitution from '../../models/Substitution.js';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import { computeShiftOfUserWithoutSubstitutions } from '../../utils/computeShiftOfUserWithSubstitutions.js';
import { getTeamAtGivenDate } from '../../utils/getTeamAtGivenDate.js';
import { getCompatibleSwitchesInRotation } from '../substitution.service.js';
/**
 * Calcule l'index dans la rotation basé sur la date et le cycleStartDate
 * @param {Date} date - Date du shift
 * @param {Object} team - Objet team avec cycleStartDate
 * @param {number} totalDays - Nombre total de jours dans la rotation
 * @returns {number} Index dans la rotation
 */
const calculateRotationIndex = (date, team, totalDays) => {
    if (!team.cycleStartDate) {
        throw new Error('cycleStartDate non défini pour l\'équipe');
    }

    const diffInMilliseconds = date - new Date(team.cycleStartDate);
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

    let dayIndex;
    if (diffInDays >= 0) {
        dayIndex = diffInDays % totalDays;
    } else {
        dayIndex = (totalDays - (Math.abs(diffInDays) % totalDays)) % totalDays;
    }

    return dayIndex;
};

/**
 * Convertit les demandes de substitution pour une nouvelle rotation
 * @param {Array} demandsToConvert - Les demandes à convertir
 * @param {string} oldRotationId - ID de l'ancienne rotation
 * @param {string} newRotationId - ID de la nouvelle rotation
 * @returns {Promise<{ converted: number, cancelled: number }>}
 */
const convertCenterDemands = async (demandsToConvert, oldRotationId, newRotationId) => {
    try {
        // Charger les rotations avec leurs jours populés
        const oldRotation = await Rotation.findById(oldRotationId).populate('days');
        const newRotation = await Rotation.findById(newRotationId).populate('days');

        if (!oldRotation || !newRotation) {
            throw new Error('Rotation introuvable');
        }

        let cancelledDemands = 0;
        let convertedDemands = 0;

        for (const demand of demandsToConvert) {
            const populatedDemand = await Substitution.findById(demand._id)
                .populate('acceptedSwitches.shift')
                .populate('posterShift.shift')
                .populate('accepterShift.shift')

            if (!populatedDemand) continue;

            let demandModified = false; 
            let demandReopened = false;


            /** === POSTER SHIFT === */
            if (populatedDemand.posterShift?.shift) {
                const index = oldRotation.days.findIndex(
                    (day) => day._id.toString() === populatedDemand.posterShift.shift._id.toString()
                );

                if (index !== -1) {
                    const newShift = newRotation.days[index];

                    if (newShift.type === 'rest') {
                        await cancelSingleDemand(populatedDemand._id);
                        cancelledDemands++;
                        continue;
                    } else {
                        populatedDemand.posterShift.shift = newShift._id;
                        demandModified = true;
                    }
                }
                else {
                    await cancelSingleDemand(populatedDemand._id);
                    cancelledDemands++;
                    continue;
                }
            }

            /** === ACCEPTER SHIFT === */
            if (['switch', 'hybrid'].includes(populatedDemand.type) && populatedDemand.accepterShift?.shift) {
                const index = oldRotation.days.findIndex(
                    (day) => day._id.toString() === populatedDemand.accepterShift.shift._id.toString()
                );

                if (index !== -1) {
                    const newShift = newRotation.days[index];

                    if (newShift.type === 'rest') {
                        populatedDemand.accepterShift = null;
                        populatedDemand.accepterId = null;
                        populatedDemand.status = 'open';
                        demandReopened = true;
                 
                    } else {
                        populatedDemand.accepterShift.shift = newShift._id;
                        demandModified = true;
                    }

                }
                else {
                    await cancelSingleDemand(populatedDemand._id);
                    cancelledDemands++;
                    continue;
                }
            }


            /** === ACCEPTED SWITCHES === */
            if (populatedDemand.acceptedSwitches?.length > 0) {
                const validSwitches = [];

                for (const switchItem of populatedDemand.acceptedSwitches) {
                    const index = oldRotation.days.findIndex(
                        (day) => day._id.toString() === switchItem.shift._id.toString()
                    );


                    if (index !== -1) {
                        const newShift = newRotation.days[index];
                        if (newShift.type !== 'rest') {
                            validSwitches.push({
                                shift: newShift._id,
                                points: switchItem.points,
                            });
                        }
                    }
                }

                if (validSwitches.length === 0) {
                    if (populatedDemand.type === 'switch') {
                        await cancelSingleDemand(populatedDemand._id);
                        cancelledDemands++;
                        continue;
                    }
                    if (populatedDemand.type === 'hybrid') {
                        populatedDemand.type = 'substitution';
                        populatedDemand.acceptedSwitches = [];
                        demandModified = true;
                    }
                } else {
                    populatedDemand.acceptedSwitches = validSwitches;
                    demandModified = true;
                }
            }

            // Si on arrive ici sans annulation → demande convertie avec succès
            if (demandModified || demandReopened) {
                await populatedDemand.save();
                convertedDemands++;
                console.log(`✅ [${demand._id}] Demande convertie avec succès`);
            }
        }


        return { converted: convertedDemands, cancelled: cancelledDemands };

    } catch (error) {
        console.error('Erreur lors de la conversion des demandes:', error);
        throw error;
    }
};



/**
 * Récupère une rotation valide (non supprimée)
 * @param {string} rotationId
 * @returns {Object} Rotation trouvée
 */
const getValidRotation = async (rotationId) => {
    const rotation = await Rotation.findOne({ _id: rotationId, deleted: false });
    if (!rotation) throw new Error('Rotation not found.');
    return rotation;
};

/**
 * Retourne les activations triées d’un centre
 * @param {string} centerId
 * @returns {Array<Object>}
 */
const getSortedActivations = async (centerId) => {
    return await getOrderedActivationDates(centerId);
};

/**
 * Nettoie les répétitions et applique les suppressions en base
 * @param {Array<Object>} repetitionToRemove
 * @returns {number} Nombre de répétitions supprimées
 */
const removeRepetitionsInDb = async (repetitionToRemove) => {
    let removedCount = 0;
    for (const repetition of repetitionToRemove) {
        await Rotation.findByIdAndUpdate(
            repetition.rotationId,
            { $pull: { activationDates: repetition.activationDate } },
            { new: true }
        );
        removedCount++;
    }
    return removedCount;
};


/**
 * Met à jour les dates d'activation d'une rotation (ajout ou suppression)
 * @param {'add' | 'remove'} action - Type d'action à effectuer ('add' ou 'remove')
 * @param {string} rotationId - ID de la rotation concernée
 * @param {string} activationDate - Date d'activation à ajouter ou supprimer
 * @returns {Object} Résultat de l'opération (besoin d'approbation ou confirmation directe)
 */
const updateActivationDate = async (action, rotationId, activationDate) => {
    try {
        if (!['add', 'remove'].includes(action)) {
            throw new Error(`Action invalide : ${action}. Utiliser 'add' ou 'remove'.`);
        }

        const rotationToUpdate = await getValidRotation(rotationId);
        const centerId = rotationToUpdate.centerId;

        // Récupération des activations actuelles du centre
        const existingActivations = await getOrderedActivationDates(centerId);
        let updatedList = [...existingActivations];
        const targetDate = new Date(activationDate);

        // === AJOUT ===
        if (action === 'add') {
            const newActivation = { rotationId, activationDate: targetDate };

            // Trouver l'index d'insertion trié par date
            let insertIndex = updatedList.length;
            for (let i = 0; i < updatedList.length; i++) {
                if (new Date(updatedList[i].activationDate) > targetDate) {
                    insertIndex = i;
                    break;
                }
            }
            updatedList.splice(insertIndex, 0, newActivation);
        }

        // === SUPPRESSION ===
        if (action === 'remove') {
            const indexToRemove = updatedList.findIndex(
                (a) => new Date(a.activationDate).getTime() === targetDate.getTime()
            );

            if (indexToRemove === -1) {
                throw new Error(`Aucune activation trouvée à la date ${activationDate}`);
            }

            updatedList.splice(indexToRemove, 1);
        }

        // Nettoyage de la liste et détection des changements
        const { cleanedList } = removeSuccessiveRepetitions(updatedList);
        const changes = findChangedPeriods(existingActivations, cleanedList);

        if (changes.length > 0) {
            await Promise.all(
                changes.map(async (change) => {
                    const demandsToConvert = await getDemandsToConvert(change, centerId);
                    console.log(
                        `[${change.from || 'no from'} → ${change.to || 'no to'}] demands affected:`,
                        demandsToConvert.length
                    );
                    change.demandsToConvert = demandsToConvert.map((demand) => demand._id);
                })
            );

            return {
                needsApproval: true,
                changes,
                message: `Cette ${action === 'add' ? 'activation' : 'suppression'} entraînera des changements qui nécessitent votre approbation`
            };
        }

        // Exécution finale selon l'action
        if (action === 'add') {
            return await confirmAddActivationDate(rotationId, activationDate);
        } else {
            return await confirmRemoveActivationDate(rotationId, activationDate);
        }

    } catch (error) {
        console.error(`Erreur lors de la ${action === 'add' ? 'création' : 'suppression'} de la date d'activation:`, error);
        throw error;
    }
};





const getDemandsToConvert = async (change, centerId) => {
    const dateFilter = {};
    if (change.from) dateFilter.$gte = new Date(change.from);
    if (change.to) dateFilter.$lte = new Date(change.to);

    const demands = await Substitution.find({
        centerId: centerId,
        status: { $in: ['open', 'accepted'] },
        deleted: false,
        'posterShift.date': dateFilter
    });

    return demands;
}

const systemCancelDemands = async (demands) => {
    try {
        const result = await Substitution.updateMany(
            { _id: { $in: demands.map(demand => demand._id) } },
            {
                $set: {
                    status: 'system-cancelled',
                    updatedAt: new Date()
                }
            }
        );
        return result;
    } catch (error) {
        console.error('Erreur lors de l\'annulation des demandes:', error);
        throw error;
    }
};


const cancelSingleDemand = async (demand) => {
    try {
        const result = await Substitution.findByIdAndUpdate(demand._id, {
            $set: {
                status: 'system-cancelled',
                updatedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'annulation de la demande:', error);
        throw error;
    }
};


const confirmAddActivationDate = async (rotationId, activationDate) => {
    try {
        console.log('confirmAddActivationDate', rotationId, activationDate);
        const rotationToUpdate = await Rotation.findOne({ _id: rotationId, deleted: false });
        if (!rotationToUpdate) {
            throw new Error('Rotation not found.');
        }

        const centerId = rotationToUpdate.centerId;
        // Vérifier les dates d'activation successives

        const beforeList = await getOrderedActivationDates(centerId);

        const updatedRotation = await Rotation.findByIdAndUpdate(
            rotationId,
            { $push: { activationDates: activationDate } },
            { new: true }
        );

        const afterList = await getOrderedActivationDates(centerId);
        const { cleanedList, repetitionToRemove } = removeSuccessiveRepetitions(afterList);
        const changes = findChangedPeriods(beforeList, cleanedList);


        const repetitionsRemoved = await removeRepetitionsInDb(repetitionToRemove);

        let message = changes.length === 0
            ? 'Cette activation n\'entraîne aucun changement'
            : 'Date d\'activation ajoutée';

        if (repetitionsRemoved > 0) {
            message += ` (${repetitionsRemoved} répétitions successives supprimées)`;
        }

        if (changes.length > 0) {
            message = await handleChanges(changes, centerId, message);
        }

        return { rotation: updatedRotation, message: message, changes: changes };
    } catch (error) {
        console.error('Erreur lors de la confirmation de la date d\'activation:', error);
        throw error;
    }
};

const confirmRemoveActivationDate = async (rotationId, activationDate) => {
    try {
        console.log('confirmRemoveActivationDate', rotationId, activationDate);
        const rotationToUpdate = await Rotation.findOne({ _id: rotationId, deleted: false });
        if (!rotationToUpdate) {
            throw new Error('Rotation not found.');
        }

        const centerId = rotationToUpdate.centerId;
        // Vérifier les dates d'activation successives

        const beforeList = await getOrderedActivationDates(centerId);

        const updatedRotation = await Rotation.findByIdAndUpdate(
            rotationId,
            { $pull: { activationDates: activationDate } },
            { new: true }
        );

        const afterList = await getOrderedActivationDates(centerId);
        const { cleanedList, repetitionToRemove } = removeSuccessiveRepetitions(afterList);
        const changes = findChangedPeriods(beforeList, cleanedList);


        const repetitionsRemoved = await removeRepetitionsInDb(repetitionToRemove);

        let message = changes.length === 0
            ? 'Cette activation n\'entraîne aucun changement'
            : 'Date d\'activation supprimée';

        if (repetitionsRemoved > 0) {
            message += ` (${repetitionsRemoved} répétitions successives supprimées)`;
        }

        if (changes.length > 0) {
            message = await handleChanges(changes, centerId, message);
        }

        return { rotation: updatedRotation, message: message, changes: changes };
    } catch (error) {
        console.error('Erreur lors de la confirmation de la date d\'activation:', error);
        throw error;
    }
};


const handleChanges = async (changes, centerId, message) => {
    try {
        await Promise.all(
            changes.map(async (change) => {
                if (!change.oldRule && !change.newRule) {
                    throw new Error('Aucune rotation trouvée pour le changement.');
                    return;
                }

               

                const oldRotation = await Rotation.findById(change.oldRule).populate('days');
                const newRotation = await Rotation.findById(change.newRule).populate('days');

                const demandsToConvert = await getDemandsToConvert(change, centerId);
       
                const oldRotationDaysCount = oldRotation?.days?.length || 0;
                const newRotationDaysCount = newRotation?.days?.length || 0;

                if (oldRotationDaysCount !== newRotationDaysCount || !newRotation) {
                    await systemCancelDemands(demandsToConvert );
                    message += ' (' + demandsToConvert.length + ' demande(s) annulée(s))';
                } else {
                    const result = await convertCenterDemands(demandsToConvert, oldRotation._id, newRotation._id);
                    if (result.converted > 0) {
                        message += ' (' + result.converted + ' demande(s) convertie(s))';
                    }
                    if (result.cancelled > 0) {
                        message += ' (' + result.cancelled + ' demande(s) annulée(s) car le shift n\'est plus disponible)';
                    }
                }

            })
        );
        return message;
    } catch (error) {
        console.error('Erreur lors de la gestion du changement:', error);
        throw error;
    }
};



/**
 * Obtient une liste ordonnée des dates d'activation successives avec les rotations correspondantes
 * @param {string} centerId - ID du centre (optionnel, si non fourni, retourne toutes les rotations)
 * @returns {Array} Liste ordonnée des activations avec rotation et date
 */
const getOrderedActivationDates = async (centerId) => {
    try {
        const activations = await Rotation.aggregate([
            { $match: { centerId, deleted: false } },
            { $unwind: '$activationDates' },
            {
                $project: {
                    rotationId: '$_id',
                    activationDate: '$activationDates'
                }
            },
            { $sort: { activationDate: 1 } }
        ]);

        return activations;
    } catch (error) {
        console.error('Erreur lors de la récupération des dates d\'activation:', error);
        throw error;
    }
};




const removeSuccessiveRepetitions = (orderedList) => {
    if (orderedList.length < 2) return { cleanedList: [...orderedList], repetitionToRemove: [] };

    const repetitionToRemove = [];
    const cleanedList = orderedList.reduce((acc, curr, i) => {
        const prev = acc[acc.length - 1];
        if (prev && prev.rotationId.toString() === curr.rotationId.toString()) {
            repetitionToRemove.push(curr);
            return acc;
        }
        return [...acc, curr];
    }, []);

    return { cleanedList, repetitionToRemove };
};


function findChangedPeriods(before, after) {
    // Convert to sorted timelines
    const allDates = Array.from(
        new Set([...before, ...after].map(a => a.activationDate))
    ).sort((a, b) => new Date(a) - new Date(b));

    const parseDate = d => new Date(d);

    // Helper: find active rule at a given time
    const getActiveRule = (list, date) => {
        const beforeDates = list
            .filter(a => parseDate(a.activationDate) <= date)
            .sort((a, b) => b.activationDate - a.activationDate);
        return beforeDates[0]?.rotationId || null;
    };

    const changes = [];
    for (let i = 0; i < allDates.length; i++) {
        const from = parseDate(allDates[i]);
        const to = allDates[i + 1] ? parseDate(allDates[i + 1]) : null;

        const oldRule = getActiveRule(before, from);
        const newRule = getActiveRule(after, from);

        if (oldRule?.toString() !== newRule?.toString()) {
            changes.push({ from, to, oldRule, newRule });
        }
    }

    console.log('changes', changes);
    return changes;
}
export default {
    findChangedPeriods,
    removeRepetitionsInDb,
    updateActivationDate,
    confirmAddActivationDate,
    confirmRemoveActivationDate,
    getSortedActivations,
    convertCenterDemands,
    calculateRotationIndex,
};
