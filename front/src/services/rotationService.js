/**
 * Service pour gérer les appels API liés aux rotations.
 * @module rotationService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const rotationService = {
  /**
   * Récupère toutes les rotations.
   * @returns {Promise<Array>} Liste des rotations.
   */
  async fetchRotations(centerId) {
    const response = await fetch(`${API_URL}/rotations/status/${centerId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère une rotation par son ID.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} Les données de la rotation.
   */
  async getRotationById(id) {
    const response = await fetch(`${API_URL}/rotations/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Crée une nouvelle rotation.
   * @param {Object} rotationData - Les données de la nouvelle rotation.
   * @returns {Promise<Object>} La rotation créée.
   */
  async createRotation(rotationData) {
    const response = await fetch(`${API_URL}/rotations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(rotationData)
    });
    return handleResponse(response);
  },

  /**
   * Met à jour une rotation.
   * @param {string} id - L'ID de la rotation.
   * @param {Object} rotationData - Les nouvelles données de la rotation.
   * @returns {Promise<Object>} La rotation mise à jour.
   */
  async updateRotation(id, rotationData) {
    const response = await fetch(`${API_URL}/rotations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(rotationData)
    });
    return handleResponse(response);
  },

  /**
   * Supprime une rotation.
   * @param {string} id - L'ID de la rotation à supprimer.
   * @returns {Promise<void>}
   */
  async deleteRotation(id) {
    const response = await fetch(`${API_URL}/rotations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Active une rotation.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} La rotation activée.
   */
  async activateRotation(id) {
    const response = await fetch(`${API_URL}/rotations/${id}/activate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Désactive une rotation.
   * @param {string} id - L'ID de la rotation.
   * @returns {Promise<Object>} La rotation désactivée.
   */
  async deactivateRotation(id) {
    const response = await fetch(`${API_URL}/rotations/${id}/deactivate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère les rotations d'un centre.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Array>} Liste des rotations du centre.
   */
  async getCenterRotations(centerId) {
    const response = await fetch(`${API_URL}/centers/${centerId}/rotations`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
