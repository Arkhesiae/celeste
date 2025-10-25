import Rotation from '../../models/Rotation.js';

import Substitution from '../../models/Substitution.js';
import User from '../../models/User.js';
import { computeShiftOfUserWithoutSubstitutions } from '../../utils/computeShiftOfUserWithSubstitutions.js';

/**
 * Convertit les demandes de substitution existantes pour une rotation donnée
 * @param {Date} startDate - Date de début de la période
 * @param {Date} endDate - Date de fin de la période
 * @param {string} centerId - ID du centre
 * @param {Object} rotation - Rotation populée avec les jours et variations
 */
const convertCenterDemands = async (startDate, endDate, centerId, rotation) => {
    try {
        // Récupérer toutes les demandes de substitution ouvertes ou acceptées pour ce centre
        const demands = await Substitution.find({
            centerId: centerId,
            status: { $in: ['open', 'accepted'] },
            deleted: false,
            'posterShift.date': { $gte: startDate, $lte: endDate }
        });

        console.log(`Conversion de ${demands.length} demandes de substitution pour le centre ${centerId}`);

        for (const demand of demands) {
            try {
                // Calculer le shift de l'utilisateur avec la nouvelle rotation
                try {
                    const user = await User.findById(demand.posterId).populate('teams');
                    if (!user) {
                        continue;
                    }

                    // Calculer le shift de l'utilisateur avec la nouvelle rotation
                    const userShifts = await computeShiftOfUserWithoutSubstitutions(demand.posterShift.date, demand.posterId);
                    const userShift = userShifts[0];

                    if (userShift && userShift.shift) {
                        // Trouver le shift correspondant dans la nouvelle rotation
                        const computedShift = rotation.days.find(day =>
                            day._id.toString() === userShift.shift._id.toString()
                        );

                        if (computedShift) {
                            const updatedPosterShift = {
                                shift: computedShift._id,
                                date: demand.posterShift.date,
                                teamId: userShift.teamObject._id,
                                selectedVariation: null
                            };

                            // Vérifier s'il y a une variation sélectionnée
                            if (userShift.shift.selectedVariation) {
                                const matchingVariation = computedShift.variations.find(variation =>
                                    variation._id.toString() === userShift.shift.selectedVariation.toString()
                                );

                                if (matchingVariation) {
                                    updatedPosterShift.selectedVariation = matchingVariation._id;
                                }
                            }

                            // Traiter aussi l'accepterShift s'il existe
                            let updatedAccepterShift = null;
                            if (demand.accepterShift && demand.accepterShift.date) {
                                try {
                                    // Calculer le shift de l'accepteur avec la nouvelle rotation
                                    const accepterShifts = await computeShiftOfUserWithoutSubstitutions(demand.accepterShift.date, demand.accepterId);
                                    const accepterShift = accepterShifts[0];

                                    if (accepterShift && accepterShift.shift) {
                                        // Trouver le shift correspondant dans la nouvelle rotation
                                        const computedAccepterShift = rotation.days.find(day =>
                                            day._id.toString() === accepterShift.shift._id.toString()
                                        );

                                        if (computedAccepterShift) {
                                            updatedAccepterShift = {
                                                shift: computedAccepterShift._id,
                                                date: demand.accepterShift.date,
                                                teamId: accepterShift.teamObject._id,
                                                selectedVariation: null
                                            };

                                            // Vérifier s'il y a une variation sélectionnée
                                            if (accepterShift.shift.selectedVariation) {
                                                const matchingVariation = computedAccepterShift.variations.find(variation =>
                                                    variation._id.toString() === accepterShift.shift.selectedVariation.toString()
                                                );

                                                if (matchingVariation) {
                                                    updatedAccepterShift.selectedVariation = matchingVariation._id;
                                                }
                                            }

                                            console.log(`AccepterShift calculé pour la demande ${demand._id}`);
                                        } else {
                                            console.warn(`Shift calculé ${accepterShift.shift._id} non trouvé dans la rotation pour l'accepterShift de la demande ${demand._id}`);
                                        }
                                    } else {
                                        console.warn(`Aucun shift calculé pour l'accepteur ${demand.accepterId} à la date ${demand.accepterShift.date} pour la demande ${demand._id}`);
                                    }
                                } catch (accepterComputeError) {
                                    console.error(`Erreur lors du calcul du shift de l'accepteur pour la demande ${demand._id}:`, accepterComputeError);
                                }
                            }

                            // Mettre à jour la demande
                            const updateData = {
                                posterShift: updatedPosterShift,
                                rotation: rotation._id,
                                updatedAt: new Date(),
                            };

                            if (updatedAccepterShift) {
                                updateData.accepterShift = updatedAccepterShift;
                            }

                            await Substitution.findByIdAndUpdate(demand._id, updateData);

                            console.log(`Demande ${demand._id} du ${demand.posterShift.date} convertie avec succès (shift calculé)`);
                        } else {
                            console.warn(`Shift calculé ${userShift.shift._id}  non trouvé dans la rotation pour la demande ${demand._id}`);
                        }
                    } else {
                        console.warn(`Aucun shift calculé pour l'utilisateur ${demand.posterId} à la date ${demand.posterShift.date} pour la demande ${demand._id}`);
                    }
                } catch (computeError) {
                    console.error(`Erreur lors du calcul du shift pour la demande ${demand._id}:`, computeError);
                }

            } catch (error) {
                console.error(`Erreur lors de la conversion de la demande ${demand._id}:`, error);
                // Continuer avec les autres demandes même si une échoue
            }
        }

        console.log(`Conversion terminée pour le centre ${centerId}`);
    } catch (error) {
        console.error('Erreur lors de la conversion des demandes de substitution:', error);
        throw error;
    }
};

/**
 * Ajoute une date d'activation à une rotation
 * @param {string} rotationId - ID de la rotation
 * @param {string} activationDate - Date d'activation à ajouter
 * @returns {Object} Rotation mise à jour
 */
const addActivationDate = async (rotationId, activationDate) => {
    try {
        // Récupérer la rotation existante
        const rotationToUpdate = await Rotation.findOne({ _id: rotationId, deleted: false });


        if (!rotationToUpdate) {
            throw new Error('Rotation not found.');
        }

        const centerId = rotationToUpdate.centerId;
        // Vérifier les dates d'activation successives
        const existingActivations = await getOrderedActivationDates(centerId);

        const listForInsertion = [...existingActivations];

        const newActivation = {
            rotationId: rotationId,
            activationDate: new Date(activationDate)
        };

        // Insérer la nouvelle activation à la bonne position
        let insertIndex = listForInsertion.length;
        for (let i = 0; i < listForInsertion.length; i++) {
            if (new Date(listForInsertion[i].activationDate) > new Date(activationDate)) {
                insertIndex = i;
                break;
            }
        }
        listForInsertion.splice(insertIndex, 0, newActivation);

        // Ajouter la nouvelle date d'activation
        const updatedRotation = await Rotation.findByIdAndUpdate(
            rotationId,
            { $push: { activationDates: activationDate } },
            { new: true }
        );

        let message = '';
        const result = await removeSuccessiveRepetitions(listForInsertion);
        const afterList = result.cleanedList;
        const repetitionsAfterInsertion = result.repetitionToRemove;
        let repetitionsRemoved = 0;

        if (repetitionsAfterInsertion.length > 0) {
            for (const repetition of repetitionsAfterInsertion) {
                await Rotation.findByIdAndUpdate(repetition.rotationId, { $pull: { activationDates: repetition.activationDate } }, { new: true });
                repetitionsRemoved++;
            }
            console.log('Removing repetitions after insertion', repetitionsAfterInsertion);
        }

        const changes = await findChangedPeriods(existingActivations, afterList);


        if (changes.length === 0) {
            message = 'Cette activation n\'entraîne aucun changement';
        } else {
            message = 'Date d\'activation ajoutée'
        }

        if (repetitionsRemoved > 0) {
            message += ' (' + repetitionsRemoved + ' répétitions successives supprimées)';
        }


        // return updatedRotation;
        return { rotation: rotationToUpdate, message: message, changes: changes };
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la date d\'activation:', error);
        throw error;
    }
};

const removeActivationDate = async (rotationId, activationDate) => {
    try {
        // Récupérer la rotation existante
        const rotationToUpdate = await Rotation.findOne({ _id: rotationId, deleted: false });

        if (!rotationToUpdate) {
            throw new Error('Rotation not found.');
        }

        const centerId = rotationToUpdate.centerId;

        const existingActivations = await getOrderedActivationDates(centerId);

        const updatedRotation = await Rotation.findByIdAndUpdate(
            rotationId,
            { $pull: { activationDates: activationDate } },
            { new: true }
        );

        const listAfterRemoval = await getOrderedActivationDates(centerId);

        let message = '';
        const result = await removeSuccessiveRepetitions(listAfterRemoval);
        const afterList = result.cleanedList;
        const repetitionsAfterRemoval = result.repetitionToRemove;
        let repetitionsRemoved = 0;

        if (repetitionsAfterRemoval.length > 0) {
            for (const repetition of repetitionsAfterRemoval) {
                await Rotation.findByIdAndUpdate(repetition.rotationId, { $pull: { activationDates: repetition.activationDate } }, { new: true });
                repetitionsRemoved++;
            }
        }
        const changes = await findChangedPeriods(existingActivations, afterList);


      
        message = 'Date d\'activation supprimée'
        

        if (repetitionsRemoved > 0) {
            message += ' (' + repetitionsRemoved + ' répétitions successives supprimées)';
        }

        return { rotation: updatedRotation, message: message, changes: changes };
    } catch (error) {
        console.error('Erreur lors de la suppression de la date d\'activation:', error);
        throw error;
    }
};

/**
 * Obtient une liste ordonnée des dates d'activation successives avec les rotations correspondantes
 * @param {string} centerId - ID du centre (optionnel, si non fourni, retourne toutes les rotations)
 * @returns {Array} Liste ordonnée des activations avec rotation et date
 */
const getOrderedActivationDates = async (centerId = null) => {
    try {
        // Récupérer toutes les rotations avec leurs dates d'activation
        const rotations = await Rotation.find({ centerId, deleted: false })
            .select('_id activationDates');

        // Créer une liste plate de toutes les activations
        const activations = [];

        for (const rotation of rotations) {
            for (const activationDate of rotation.activationDates) {
                activations.push({
                    rotationId: rotation._id,
                    activationDate: activationDate,
                });
            }
        }

        // Trier par date d'activation (du plus ancien au plus récent)
        activations.sort((a, b) => new Date(a.activationDate) - new Date(b.activationDate));
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
    addActivationDate,
    removeActivationDate,
    convertCenterDemands,
    getOrderedActivationDates,
    removeSuccessiveRepetitions,
};
