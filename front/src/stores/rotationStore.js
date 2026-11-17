import { defineStore } from 'pinia';
import { rotationService } from '@/services/rotationService';

/**
 * Store Pinia pour gérer l'état des tours de service.
 * @module rotationStore
 */
export const useRotationStore = defineStore('rotation', () => {
  // State
  const loading = ref(true);

  const rotationsByCenterId = ref({}); // { [centerId]: rotation[] }

  const getRotationsForCenter = (centerId) => {
    return rotationsByCenterId.value[centerId] ?? [];
  };

  /**
   * Un tour de service (nom, jours) d'après son id, parmi ceux des centres déjà chargés ; null s'il n'est pas chargé.
   * @param {string} rotationId
   */
  const findRotationById = (rotationId) => {
    for (const data of Object.values(rotationsByCenterId.value)) {
      const rotation = data.allRotations?.find((candidate) => candidate._id === rotationId);
      if (rotation) return rotation;
    }
    return null;
  };

  /**
   * Le tour de service qui contient une vacation (un de ses jours), parmi ceux des centres déjà chargés ; null sinon.
   * @param {string} shiftId
   */
  const findRotationOfShift = (shiftId) => {
    for (const data of Object.values(rotationsByCenterId.value)) {
      const rotation = data.allRotations?.find((candidate) => candidate.days?.some((day) => day._id === shiftId));
      if (rotation) return rotation;
    }
    return null;
  };

  /**
   * Tour de service actif d'un centre : celui dont la période contient le jour courant du centre (le serveur calcule le statut
   * dans le fuseau du centre, voir `listRotationsWithStatus`) ; null si aucun, ou tant que le centre n'est pas chargé.
   * @param {string} centerId
   */
  const getActiveRotationForCenter = (centerId) => {
    return getRotationsForCenter(centerId).sortedRotations?.find((rotation) => rotation.status === 'active') ?? null;
  };

  /**
   * Récupère les tours de service pour un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   */
  const fetchRotations = async (centerId) => {
    if (!centerId) {
      console.warn('[rotationStore] fetchRotations skipped: missing centerId');
      return [];
    }

    try {
      //  if (rotationsByCenterId.value[centerId]) return
      loading.value = true;
      const data = await rotationService.fetchRotations(centerId);
      rotationsByCenterId.value[centerId] = data;
    } catch (error) {
      console.error('Erreur lors de la récupération des tours de service :', error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Supprime ou confirme la suppression d'une date d'activation d'un tour de service.
   * @param {string} rotationId - L'identifiant du tour de service.
   * @param {string} date - La date d'activation à supprimer.
   * @param {string} centerId - L'ID du centre pour rafraîchir les données.
   * @param {Object} options - Options supplémentaires.
   * @param {boolean} options.confirm - Si true, confirme et applique la suppression.
   */
  const removeActivationDate = async (rotationId, date, centerId, { confirm = false } = {}) => {
    try {
      const result = await rotationService.removeActivationDate(rotationId, date, confirm);
      await fetchRotations(centerId);
      return result;
    } catch (error) {
      console.error(
        `Erreur lors de la ${confirm ? 'confirmation de la ' : ''}suppression de la date d'activation :`,
        error,
      );
      throw error;
    }
  };

  /**
   * Sauvegarde un nouveau tour de service.
   * @param {Object} rotation - Les données du tour de service.
   */
  const saveRotation = async (rotation) => {
    try {
      await rotationService.createRotation(rotation);
      await fetchRotations(rotation.centerId); // Rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de la création du tour de service :', error);
      throw error;
    }
  };
  /**
   * Active ou confirme un tour de service.
   * @param {string} rotationId - L'identifiant du tour de service.
   * @param {string} activationDate - La date d'activation.
   * @param {string} centerId - L'identifiant du centre.
   * @param {Object} options - Options supplémentaires.
   * @param {boolean} options.confirm - Si true, confirme et applique l'activation.
   */
  const setActiveRotation = async (rotationId, activationDate, centerId, { confirm = false } = {}) => {
    try {
      const result = await rotationService.setActiveRotation(rotationId, activationDate, confirm);
      await fetchRotations(centerId);
      return result;
    } catch (error) {
      console.error(`Erreur lors de l'${confirm ? "confirmation de l'" : ''}activation du tour de service :`, error);
      throw error;
    }
  };

  /**
   * Supprime un tour de service.
   * @param {string} rotationId - L'ID du tour de service.
   * @param {string} centerId - L'ID du centre pour rafraîchir les données.
   */
  const deleteRotation = async (rotationId, centerId) => {
    await rotationService.deleteRotation(rotationId);
    await fetchRotations(centerId); // Rafraîchir les données
  };

  /**
   * Duplique une rotation.
   * @param {string} rotationId - L'ID de la rotation à dupliquer.
   * @param {string} centerId - L'ID du centre pour rafraîchir les données.
   */
  const duplicateRotation = async (rotationId, centerId) => {
    try {
      await rotationService.duplicateRotation(rotationId);
      await fetchRotations(centerId); // Rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de la duplication de la rotation :', error);
      throw error;
    }
  };

  /**
   * Met à jour un jour dans une rotation.
   * @param {string} rotationId - L'ID de la rotation.
   * @param {number} dayIndex - L'index du jour à mettre à jour.
   * @param {Object} updatedDay - Les nouvelles données du jour.
   * @param {string} centerId - L'ID du centre pour rafraîchir les données.
   */
  const updateDayInRotation = async (rotationId, updatedDay, centerId) => {
    try {
      await rotationService.updateDayInRotation(rotationId, updatedDay);
      await fetchRotations(centerId); // Rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de la mise à jour du jour :', error);
      throw error;
    }
  };

  /**
   * Met à jour un tour de service existant.
   * @param {string} rotationId - L'ID de la rotation.
   * @param {Object} updatedRotation - Les nouvelles données de la rotation.
   */
  const updateRotation = async (rotationId, updatedRotation) => {
    try {
      await rotationService.updateRotation(rotationId, updatedRotation);
      await fetchRotations(updatedRotation.centerId); // Rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la rotation :', error);
      throw error;
    }
  };

  const emptyStore = () => {
    rotationsByCenterId.value = {};
  };

  return {
    loading,

    getRotationsForCenter,
    getActiveRotationForCenter,
    findRotationById,
    findRotationOfShift,
    fetchRotations,
    removeActivationDate,
    saveRotation,
    setActiveRotation,
    deleteRotation,
    updateDayInRotation,
    duplicateRotation,
    updateRotation,
    emptyStore,
  };
});
