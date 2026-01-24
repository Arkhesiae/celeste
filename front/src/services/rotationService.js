/**
 * Service pour gérer les appels API liés aux rotations.
 * @module rotationService
 */
import { apiFetch } from '../config/api';

export const rotationService = {
  /**
   * Récupère toutes les rotations.
   * @returns {Promise<Array>} Liste des rotations.
   */
  async fetchRotations(centerId) {
    const response = await apiFetch(`/rotations/status/${centerId}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère une rotation par son ID.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} Les données de la rotation.
   */
  async getRotationById(id) {
    const response = await apiFetch(`/rotations/${id}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Crée une nouvelle rotation.
   * @param {Object} rotationData - Les données de la nouvelle rotation.
   * @returns {Promise<Object>} La rotation créée.
   */
  async createRotation(rotationData) {
    const response = await apiFetch(`/rotations/create`, {
      method: 'POST',
      body: JSON.stringify(rotationData)
    });
    return response;
  },

  /**
   * Met à jour une rotation.
   * @param {string} id - L'ID de la rotation.
   * @param {Object} rotationData - Les nouvelles données de la rotation.
   * @returns {Promise<Object>} La rotation mise à jour.
   */
  async updateRotation(id, rotationData) {
    const response = await apiFetch(`/rotations/${id}/update`, {
      method: 'PUT',
      body: JSON.stringify(rotationData)
    });
    return response;
  },

  /**
   * Supprime une rotation.
   * @param {string} id - L'ID de la rotation à supprimer.
   * @returns {Promise<void>}
   */
  async deleteRotation(id) {
    const response = await apiFetch(`/rotations/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Active une rotation.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} La rotation activée.
   */
  async setActiveRotation(id, activationDate  ) {
    const response = await apiFetch(`/rotations/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ activationDate })
    });
    return response;
  },

  /**
   * Confirme et applique l'activation d'une rotation après approbation utilisateur.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} La rotation activée.
   */
  async confirmAddActivation(id, activationDate) {
    const response = await apiFetch(`/rotations/${id}/confirm-activate`, {
      method: 'POST',
      body: JSON.stringify({ activationDate })
    });
    return response;
  },

  /**
   * Confirme et applique la suppression d'une date d'activation après approbation utilisateur.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} La rotation activée.
   */
  async confirmRemoveActivation(id, activationDate) {
    const response = await apiFetch(`/rotations/${id}/confirm-remove-activate`, {
      method: 'POST',
      body: JSON.stringify({ activationDate })
    });
    return response;
  },

  /**
   * Désactive une rotation.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} La rotation désactivée.
   */
  async removeActivationDate(id, activationDate) {
    const response = await apiFetch(`/rotations/${id}/remove-date`, {
      method: 'POST',
      body: JSON.stringify({ activationDate })
    });
    return response;
  },

  /**
   * Récupère les rotations d'un centre.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Array>} Liste des rotations du centre.
   */
  async getCenterRotations(centerId) {
      const response = await apiFetch(`/centers/${centerId}/rotations`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Met à jour un jour dans une rotation.
   * @param {string} id - L'ID de la rotation.
   * @param {Object} updatedDay - Les nouvelles données du jour.
   * @returns {Promise<Object>} La rotation mise à jour.
   */
  async updateDayInRotation(id, updatedDay) {
    const response = await apiFetch(`/rotations/${id}/day`, {
      method: 'PUT',
      body: JSON.stringify({ updatedDay })
    });
    return response;
  },

  /**
   * Duplique une rotation.
   * @param {string} id - L'ID de la rotation à dupliquer.
   * @returns {Promise<Object>} La rotation dupliquée.
   */
  async duplicateRotation(id) {
    const response = await apiFetch(`/rotations/${id}/duplicate`, {
      method: 'POST',
    });
    return response;
  }
};
