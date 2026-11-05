/**
 * Service pour gérer les appels API liés aux équipes.
 * @module teamService
 */
import { apiFetch } from '../config/api';

export const teamService = {
  /**
   * Récupère toutes les équipes.
   * @returns {Promise<Array>} Liste des équipes.
   */
  async getTeams(centerId, { publicList = false } = {}) {
    // `publicList` : liste publique (id et nom seulement) pour le formulaire d'inscription, avant qu'un compte n'existe
    const response = await apiFetch(publicList ? `/teams/public/${centerId}` : `/teams/${centerId}`, {
      method: 'GET'
    });
    return response;
  },

   /**
   * Récupère toutes les équipes.
   * @returns {Promise<Array>} Liste des équipes.
   */
  async getAllTeams() {
    const response = await apiFetch(`/teams`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère une équipe par son ID.
   * @param {string} id - L'ID de l'équipe.
   * @returns {Promise<Object>} Les données de l'équipe.
   */
  async getTeamById(id) {
      const response = await apiFetch(`/teams/${id}`, {
      method: 'GET'
    });
    return response;
  },


  /**
   * Crée une nouvelle équipe.
   * @param {Object} teamData - Les données de la nouvelle équipe.
   * @returns {Promise<Object>} L'équipe créée.
   */
  async createTeam({ centerId, ...teamData }) {
    const response = await apiFetch(`/teams/center/${centerId}`, {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
    return response;
  },

  /**
   * Met à jour une équipe.
   * @param {string} id - L'ID de l'équipe.
   * @param {Object} teamData - Les nouvelles données de l'équipe.
   * @returns {Promise<Object>} L'équipe mise à jour.
   */
  async renameTeam(id, teamData) {
    const response = await apiFetch(`/teams/${id}/name`, {
      method: 'PUT',
      body: JSON.stringify(teamData)
    });
    return response;
  },

  /**
   * Supprime une équipe.
   * @param {string} id - L'ID de l'équipe à supprimer.
   * @returns {Promise<void>}
   */
  async deleteTeam(id) {
    const response = await apiFetch(`/teams/${id}`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Ajoute un membre à une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @param {string} userId - L'ID de l'utilisateur à ajouter.
   * @returns {Promise<Object>} L'équipe mise à jour.
   */
  async assignToTeam(userId, teamData) {
    const response = await apiFetch(`/users/${userId}/assign-team`, {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
    return response;
  },

  /**
   * Supprime une occurrence d'équipe. Sans `confirmed`, la réponse peut être `{ needsApproval: true, ... }`
   * (409) si des demandes ou entrées de calendrier seraient annulées.
   */
  async deleteTeamOccurrence(userId, occurrenceId, confirmed = false) {
    const response = await apiFetch(`/users/${userId}/team-occurrences/${occurrenceId}${confirmed ? '?confirmed=true' : ''}`, {
      method: 'DELETE',
    });
    return response;
  },


  /**
   * Récupère les membres d'une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @returns {Promise<Array>} Liste des membres de l'équipe.
   */
  async getTeamMembers(teamId) {
    const response = await apiFetch(`/teams/${teamId}/members`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Met à jour la date de début de cycle d'une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @param {string} date - La date de début de cycle.
   * @returns {Promise<Object>} L'équipe mise à jour.
   */
  async updateTeamCycleStartDate(teamId, cycleStartDate) {
    const response = await apiFetch(`/teams/${teamId}/cycle-start-date`, {
      method: 'PUT',
      body: JSON.stringify({ cycleStartDate })
    });
    return response;
  },

  /**
   * Grille d'une équipe : membres (permanents et renforts) et leurs vacations / entrées par jour.
   * @param {string} teamId
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate - YYYY-MM-DD (7 jours maximum avec la date de début)
   * @returns {Promise<{ team, startDate, endDate, members: Array }>}
   */
  async getTeamGrid(teamId, startDate, endDate) {
    const params = new URLSearchParams({ startDate, endDate });
    return apiFetch(`/teams/${teamId}/grid?${params}`, { method: 'GET' });
  },

  /**
   * Met à jour l'ordre des équipes.
   * @param {Array<string>} teamIds - Liste ordonnée des IDs des équipes.
   * @returns {Promise<Array>} Liste mise à jour des équipes.
   */
  async updateTeamsOrder(teamIds) {
    const response = await apiFetch(`/teams/order`, {
      method: 'PUT',
      body: JSON.stringify({ teamIds })
    });
    return response;
  }
};
