/**
 * Service pour gérer les appels API liés aux utilisateurs.
 * @module userService
 */
import { apiFetch } from '../config/api';

export const userService = {
  /**
   * Récupère tous les utilisateurs.
   * @returns {Promise<Array>} Liste des utilisateurs.
   */
  async getUsers() {
    const response = await apiFetch(`/users`, {
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
   * Récupère un utilisateur par son ID.
   * @param {string} id - L'ID de l'utilisateur.
   * @returns {Promise<Object>} Les données de l'utilisateur.
   */
  async getUserById(id) {
    const response = await apiFetch(`/users/${id}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Met à jour les informations d'un utilisateur.
   * @param {string} id - L'ID de l'utilisateur.
   * @param {Object} userData - Les nouvelles données de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur mis à jour.
   */
  async updateUser(id, userData) {
    const response = await apiFetch(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
    return response;
  },

  /**
   * Supprime un utilisateur.
   * @param {string} id - L'ID de l'utilisateur à supprimer.
   * @returns {Promise<void>}
   */
  async deleteUser(id) {
    const response = await apiFetch(`/users/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Met à jour les préférences de l'utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {Object} preferences - Les nouvelles préférences.
   * @returns {Promise<Object>} Les préférences mises à jour.
   */
  async updateUserPreferences(userId, preferences) {
    const response = await apiFetch(`/users/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify({ preferences })
    });
    return response;
  },

  /**
   * Met à jour l'avatar d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {FormData} formData - Les données du formulaire contenant l'image.
   * @returns {Promise<Object>} Les données mises à jour de l'utilisateur.
   */
  async updateAvatar(userId, formData) {
    const response = await apiFetch(`/users/${userId}/avatar`, {
      method: 'POST',
      body: formData
    });
    return response;
  },

  /**
   * Récupère les utilisateurs groupés par équipe pour un centre.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Object>} Les utilisateurs groupés par équipe.
   */
  async fetchUsersAndGroupByTeam(centerId) {
    const response = await apiFetch(`/users/teams/${centerId}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère les occurrences d'équipe d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Array>} Liste des occurrences d'équipe.
   */
  async fetchTeamOccurrencesOfUser(userId) {
    const response = await apiFetch(`/users/${userId}/team-occurrences`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère l'équipe actuelle d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Object>} Les données de l'équipe.
   */
  async fetchCurrentTeamOfUser(userId) {
    const response = await apiFetch(`/users/${userId}/current-team`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Approuve un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur à approuver.
   * @returns {Promise<Object>} L'utilisateur approuvé.
   */
  async approvePendingUser(userId) {
    const response = await apiFetch(`/users/pending/${userId}/approve`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Supprime un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur à supprimer.
   * @returns {Promise<void>}
   */
  async deletePendingUser(userId) {
    const response = await apiFetch(`/users/pending/${userId}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Rend un utilisateur administrateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur mis à jour.
   */
  async makeAdmin(userId) {
    const response = await apiFetch(`/users/${userId}/make-admin`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Retire le statut administrateur d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur mis à jour.
   */
  async removeAdmin(userId) {
    const response = await apiFetch(`/users/${userId}/remove-admin`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Assigne un utilisateur à un centre.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Object>} La réponse de l'assignation.
   */
  async assignCenter(userId, centerId) {
    const response = await apiFetch(`/users/${userId}/assign-center`, {
      method: 'POST',
      body: JSON.stringify({ centerId })
    });
    return response;
  },

};
