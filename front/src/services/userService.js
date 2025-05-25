/**
 * Service pour gérer les appels API liés aux utilisateurs.
 * @module userService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';
import { useAuthStore } from '../stores/authStore';

export const userService = {
  /**
   * Récupère tous les utilisateurs.
   * @returns {Promise<Array>} Liste des utilisateurs.
   */
  async getUsers() {
    const response = await fetch(`${API_URL}/users`, {
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
   * Récupère un utilisateur par son ID.
   * @param {string} id - L'ID de l'utilisateur.
   * @returns {Promise<Object>} Les données de l'utilisateur.
   */
  async getUserById(id) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Met à jour les informations d'un utilisateur.
   * @param {string} id - L'ID de l'utilisateur.
   * @param {Object} userData - Les nouvelles données de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur mis à jour.
   */
  async updateUser(id, userData) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  /**
   * Supprime un utilisateur.
   * @param {string} id - L'ID de l'utilisateur à supprimer.
   * @returns {Promise<void>}
   */
  async deleteUser(id) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère l'utilisateur actuellement connecté.
   * @returns {Promise<Object>} Les données de l'utilisateur courant.
   */
  async getCurrentUser() {
    const response = await fetch(`${API_URL}/users/me`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Met à jour les préférences de l'utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {Object} preferences - Les nouvelles préférences.
   * @returns {Promise<Object>} Les préférences mises à jour.
   */
  async updateUserPreferences(userId, preferences) {
    const response = await fetch(`${API_URL}/users/${userId}/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ preferences })
    });
    return handleResponse(response);
  },

  /**
   * Met à jour l'avatar d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {FormData} formData - Les données du formulaire contenant l'image.
   * @returns {Promise<Object>} Les données mises à jour de l'utilisateur.
   */
  async updateAvatar(userId, formData) {
    const authStore = useAuthStore();
    console.log(formData);
    const response = await fetch(`${API_URL}/users/${userId}/avatar`, {
      method: 'POST',
      headers: {"Authorization": `Bearer ${authStore.accessToken}`},
      body: formData
    });
    return handleResponse(response);
  },

  /**
   * Récupère les utilisateurs groupés par équipe pour un centre.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Object>} Les utilisateurs groupés par équipe.
   */
  async fetchUsersAndGroupByTeam(centerId) {
    const response = await fetch(`${API_URL}/users/teams/${centerId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère les occurrences d'équipe d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Array>} Liste des occurrences d'équipe.
   */
  async fetchTeamOccurrencesOfUser(userId) {
    const response = await fetch(`${API_URL}/users/${userId}/team-occurrences`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère l'équipe actuelle d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Object>} Les données de l'équipe.
   */
  async fetchCurrentTeamOfUser(userId) {
    const response = await fetch(`${API_URL}/users/${userId}/current-team`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Approuve un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur à approuver.
   * @returns {Promise<Object>} L'utilisateur approuvé.
   */
  async approvePendingUser(userId) {
    const response = await fetch(`${API_URL}/users/pending/${userId}/approve`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Supprime un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur à supprimer.
   * @returns {Promise<void>}
   */
  async deletePendingUser(userId) {
    const response = await fetch(`${API_URL}/users/pending/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
