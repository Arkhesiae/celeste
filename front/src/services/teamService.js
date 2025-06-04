/**
 * Service pour gérer les appels API liés aux équipes.
 * @module teamService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const teamService = {
  /**
   * Récupère toutes les équipes.
   * @returns {Promise<Array>} Liste des équipes.
   */
  async getTeams(centerId) {
    const response = await fetch(`${API_URL}/teams/${centerId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère une équipe par son ID.
   * @param {string} id - L'ID de l'équipe.
   * @returns {Promise<Object>} Les données de l'équipe.
   */
  async getTeamById(id) {
    const response = await fetch(`${API_URL}/teams/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },


  /**
   * Crée une nouvelle équipe.
   * @param {Object} teamData - Les données de la nouvelle équipe.
   * @returns {Promise<Object>} L'équipe créée.
   */
  async createTeam(teamData) {
    const response = await fetch(`${API_URL}/teams/create-team`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(teamData)
    });
    return handleResponse(response);
  },

  /**
   * Met à jour une équipe.
   * @param {string} id - L'ID de l'équipe.
   * @param {Object} teamData - Les nouvelles données de l'équipe.
   * @returns {Promise<Object>} L'équipe mise à jour.
   */
  async renameTeam(id, teamData) {
    const response = await fetch(`${API_URL}/teams/${id}/name`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(teamData)
    });
    return handleResponse(response);
  },

  /**
   * Supprime une équipe.
   * @param {string} id - L'ID de l'équipe à supprimer.
   * @returns {Promise<void>}
   */
  async deleteTeam(id) {
    const response = await fetch(`${API_URL}/teams/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Ajoute un membre à une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @param {string} userId - L'ID de l'utilisateur à ajouter.
   * @returns {Promise<Object>} L'équipe mise à jour.
   */
  async addTeamMember(teamId, userId) {
    const response = await fetch(`${API_URL}/teams/${teamId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId })
    });
    return handleResponse(response);
  },

  /**
   * Supprime un membre d'une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @param {string} userId - L'ID de l'utilisateur à supprimer.
   * @returns {Promise<Object>} L'équipe mise à jour.
   */
  async removeTeamMember(teamId, userId) {
    const response = await fetch(`${API_URL}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère les membres d'une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @returns {Promise<Array>} Liste des membres de l'équipe.
   */
  async getTeamMembers(teamId) {
    const response = await fetch(`${API_URL}/teams/${teamId}/members`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Met à jour la date de début de cycle d'une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @param {string} date - La date de début de cycle.
   * @returns {Promise<Object>} L'équipe mise à jour.
   */
  async updateTeamCycleStartDate(teamId, cycleStartDate) {
    const response = await fetch(`${API_URL}/teams/${teamId}/cycle-start-date`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ cycleStartDate })
    });
    return handleResponse(response);
  },

  /**
   * Met à jour l'ordre des équipes.
   * @param {Array<string>} teamIds - Liste ordonnée des IDs des équipes.
   * @returns {Promise<Array>} Liste mise à jour des équipes.
   */
  async updateTeamsOrder(teamIds) {
    const response = await fetch(`${API_URL}/teams/order`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ teamIds })
    });
    return handleResponse(response);
  }
};
