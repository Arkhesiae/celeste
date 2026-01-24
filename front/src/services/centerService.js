/**
 * Service pour gérer les appels API liés aux centres.
 * @module centerService
 */
import { apiFetch } from '../config/api';

export const centerService = {
  /**
   * Récupère tous les centres.
   * @returns {Promise<Array>} Liste des centres.
   */
  async fetchCenters() {
    const response = await apiFetch(`/center`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère les utilisateurs d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Array>} Liste des utilisateurs du centre.
   */
  async fetchUsersByCenter(centerId) {
    const response = await apiFetch(`/users/center/${centerId}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère le centre d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Object>} Le centre de l'utilisateur.
   */
  async getUserCenterById(userId) {
    const userResponse = await apiFetch(`/users/${userId}`, {
      method: 'GET'
    });
    const user = await userResponse;
    const centerId = user.centerId;

    if (!centerId) {
      throw new Error('L\'utilisateur n\'appartient à aucun centre.');
    }

    const centerResponse = await apiFetch(`/center/${centerId}`, {
      method: 'GET'
    });
    return centerResponse;
  },

  /**
   * Ajoute un nouveau centre.
   * @param {Object} newCenter - Les données du nouveau centre.
   * @returns {Promise<Object>} Le centre ajouté.
   */
  async createCenter(newCenter) {
    const response = await apiFetch(`/center`, {
      method: 'POST',
      body: JSON.stringify(newCenter),
    });
    return response;
  },

  /**
   * Supprime un centre.
   * @param {string} centerId - L'ID du centre à supprimer.
   * @returns {Promise<void>}
   */
  async deleteCenter(centerId) {
    const response = await apiFetch(`/center/${centerId}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Récupère toutes les rotations actives de tous les centres.
   * @returns {Promise<Object>} Les rotations actives par centre.
   */
  async fetchActiveRotations() {
    const response = await apiFetch(`/center/all-active-rotations`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère la rotation active d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Object>} La rotation active du centre.
   */
  async fetchActiveRotationOfCenter(centerId) {
    const response = await apiFetch(`/center/${centerId}/active-rotation`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère les administrateurs d'un centre spécifique.
   * @returns {Promise<Object>} Les administrateurs du centre.
   */
  async fetchAdminsByCenter() {
      const response = await apiFetch(`/center/admins`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère le nombre d'utilisateurs par centre.
   * @returns {Promise<Object>} Le nombre d'utilisateurs par centre.
   */
  async fetchUsersCountByCenter() { 
    const response = await apiFetch(`/center/users/count`, {
      method: 'GET'
    });
    return response;
  } 
};
