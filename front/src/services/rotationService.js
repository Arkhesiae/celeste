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
    const response = await apiFetch(`/rotations/center/${rotationData.centerId}`, {
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
   * Active une rotation à une date. Sans `confirm`, simple aperçu : si des demandes sont touchées, la réponse est
   * `{ needsApproval: true, changes }` (409) et rien n'est appliqué ; avec `confirm`, le changement est appliqué.
   * @param {string} id - L'ID de la rotation.
   * @param {string} activationDate - La date d'activation (YYYY-MM-DD).
   * @param {boolean} [confirm=false] - Applique le changement après approbation de l'utilisateur.
   * @returns {Promise<Object>} Aperçu ou résultat de l'activation.
   */
  async setActiveRotation(id, activationDate, confirm = false) {
    const response = await apiFetch(`/rotations/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ activationDate, confirmed: confirm })
    });
    return response;
  },

  /**
   * Supprime une date d'activation. Sans `confirm`, simple aperçu (voir setActiveRotation) ; avec `confirm`,
   * la suppression est appliquée.
   * @param {string} id - L'ID de la rotation.
   * @param {string} activationDate - La date d'activation à supprimer (YYYY-MM-DD).
   * @param {boolean} [confirm=false] - Applique le changement après approbation de l'utilisateur.
   * @returns {Promise<Object>} Aperçu ou résultat de la suppression.
   */
  async removeActivationDate(id, activationDate, confirm = false) {
    const response = await apiFetch(`/rotations/${id}/remove-date`, {
      method: 'POST',
      body: JSON.stringify({ activationDate, confirmed: confirm })
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
