/**
 * Service pour gérer les appels API liés aux centres.
 * @module centerService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const centerService = {
  /**
   * Récupère tous les centres.
   * @returns {Promise<Array>} Liste des centres.
   */
  async fetchCenters() {
    const response = await fetch(`${API_URL}/center`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère les utilisateurs d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Array>} Liste des utilisateurs du centre.
   */
  async fetchUsersByCenter(centerId) {
    const response = await fetch(`${API_URL}/users/center/${centerId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère le centre d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Object>} Le centre de l'utilisateur.
   */
  async getUserCenterById(userId) {
    const userResponse = await fetch(`${API_URL}/users/${userId}`, {
      headers: getAuthHeaders()
    });
    const user = await handleResponse(userResponse);
    const centerId = user.centerId;

    if (!centerId) {
      throw new Error('L\'utilisateur n\'appartient à aucun centre.');
    }

    const centerResponse = await fetch(`${API_URL}/center/${centerId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(centerResponse);
  },

  /**
   * Ajoute un nouveau centre.
   * @param {Object} newCenter - Les données du nouveau centre.
   * @returns {Promise<Object>} Le centre ajouté.
   */
  async createCenter(newCenter) {
    const response = await fetch(`${API_URL}/center`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(newCenter),
    });
    return handleResponse(response);
  },

  /**
   * Supprime un centre.
   * @param {string} centerId - L'ID du centre à supprimer.
   * @returns {Promise<void>}
   */
  async deleteCenter(centerId) {
    const response = await fetch(`${API_URL}/center/${centerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère toutes les rotations actives de tous les centres.
   * @returns {Promise<Object>} Les rotations actives par centre.
   */
  async fetchActiveRotations() {
    const response = await fetch(`${API_URL}/center/all-active-rotations`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère la rotation active d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Object>} La rotation active du centre.
   */
  async fetchActiveRotationOfCenter(centerId) {
    const response = await fetch(`${API_URL}/center/${centerId}/active-rotation`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère les administrateurs d'un centre spécifique.
   * @returns {Promise<Object>} Les administrateurs du centre.
   */
  async fetchAdminsByCenter() {
    const response = await fetch(`${API_URL}/center/admins`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère le nombre d'utilisateurs par centre.
   * @returns {Promise<Object>} Le nombre d'utilisateurs par centre.
   */
  async fetchUsersCountByCenter() { 
    const response = await fetch(`${API_URL}/center/users/count`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  } 
};
