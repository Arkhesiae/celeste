import { defineStore } from 'pinia';
import { ref } from 'vue';
import { rotationService } from '@/services/rotationService';

/**
 * Store Pinia pour gérer l'état des tours de service.
 * @module rotationStore
 */
export const useRotationStore = defineStore('rotation', () => {
  // State
  const rotations = ref([]); // Liste des tours de service
  const sortedRotations = ref([]); // Liste des tours de service triés
  const activeRotation = ref(null); // Tour de service actif

  /**
   * Récupère les tours de service pour un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   */
  const fetchRotations = async (centerId) => {
    try {
      const data = await rotationService.fetchRotations(centerId);
      console.log(data);
      rotations.value = data.allRotations;
      sortedRotations.value = data.sortedRotations;
    } catch (error) {
      console.error('Erreur lors de la récupération des tours de service :', error);
    }
  };

  /**
   * Supprime une date d'activation d'un tour de service.
   * @param {string} rotationId - L'ID du tour de service.
   * @param {string} date - La date à supprimer.
   * @param {string} centerId - L'ID du centre pour rafraîchir les données.
   */
  const removeActivationDate = async (rotationId, date, centerId) => {
    try { 
      await rotationService.removeActivationDate(rotationId, date);
      await fetchRotations(centerId); // Rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de la suppression de la date d\'activation :', error);
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
   * Active un tour de service.
   * @param {Object} rotation - Le tour de service à activer.
   * @param {string} activationDate - La date d'activation.
   */
  const setActiveRotation = async (rotation, activationDate) => {
    try {
      await rotationService.setActiveRotation(rotation._id, activationDate);
      await fetchRotations(rotation.centerId); // Rafraîchir les données
    } catch (error) {
      console.error('Erreur lors de l\'activation du tour de service :', error);
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

  return {
    rotations,
    sortedRotations,
    activeRotation,
  
    fetchRotations,
    removeActivationDate,
    saveRotation,
    setActiveRotation,
    deleteRotation,
    updateDayInRotation,
    duplicateRotation,
    updateRotation,
  };
});
