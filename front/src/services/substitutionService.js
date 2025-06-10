/**
 * Service pour gérer les appels API liés aux substitutions.
 * @module substitutionService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const substitutionService = {
  /**
   * Récupère les demandes de substitution d'un centre et les marque comme vues.
   * @param {Object} dates - Objet contenant les dates de début et de fin
   * @param {string} dates.startDate - Date de début au format ISO
   * @param {string} dates.endDate - Date de fin au format ISO
   * @param {string} [status] - Statut optionnel pour filtrer les demandes ('open', 'accepted', 'completed', 'cancelled')
   * @returns {Promise<Array>} Liste des demandes de substitution
   */
  async fetchAndMarkAsSeen(dates, status) {
    const url = new URL(`${API_URL}/substitution/center`);
    
    // Vérifier que les dates sont définies
    if (!dates || !dates.startDate || !dates.endDate) {
      throw new Error('Les dates de début et de fin sont requises');
    }
    
    // Ajouter les paramètres de date
    url.searchParams.append('startDate', JSON.stringify(dates.startDate));
    url.searchParams.append('endDate', JSON.stringify(dates.endDate));
    // Ajouter le statut uniquement s'il est défini
    if (status && status !== 'undefined') {
      url.searchParams.append('status', status);
    }
    
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Récupère une substitution par son ID.
   * @param {string} id - L'ID de la substitution.
   * @returns {Promise<Object>} Les données de la substitution.
   */
  async getSubstitutionById(id) {
    const response = await fetch(`${API_URL}/substitution/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Crée une nouvelle substitution.
   * @param {Object} substitutionData - Les données de la nouvelle substitution.
   * @returns {Promise<Object>} La substitution créée.
   */
  async createSubstitutionDemand(substitutionData) {
    const response = await fetch(`${API_URL}/substitution`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(substitutionData)
    });
    return handleResponse(response);
  },

  /**
   * Met à jour une substitution.
   * @param {string} id - L'ID de la substitution.
   * @param {Object} substitutionData - Les nouvelles données de la substitution.
   * @returns {Promise<Object>} La substitution mise à jour.
   */
  async updateSubstitution(id, substitutionData) {
    const response = await fetch(`${API_URL}/substitution/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(substitutionData)
    });
    return handleResponse(response);
  },

  /**
   * Supprime une substitution.
   * @param {string} id - L'ID de la substitution à supprimer.
   * @returns {Promise<void>}
   */
  async cancelDemand(id) {
    const response = await fetch(`${API_URL}/substitution/${id}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Accepte une demande de substitution.
   * @param {string} id - L'ID de la substitution.
   * @returns {Promise<Object>} La substitution acceptée.
   */
  async acceptDemand(id) {
    const response = await fetch(`${API_URL}/substitution/${id}/accept`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Refuse une substitution.
   * @param {string} id - L'ID de la substitution.
   * @returns {Promise<Object>} La substitution refusée.
   */
  async rejectSubstitution(id) {
    const response = await fetch(`${API_URL}/substitution/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère les substitutions d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Array>} Liste des substitutions de l'utilisateur.
   */
  async getUserSubstitutions(userId) {
    const response = await fetch(`${API_URL}/users/${userId}/substitution`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Vérifie le shift d'un utilisateur pour une date donnée.
   * @param {string} date - La date à vérifier.
   * @returns {Promise<Object>} Les informations du shift.
   */
  async checkUserShift(date) {
    const response = await fetch(`${API_URL}/substitution/check-shift/${date}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Échange les shifts entre deux utilisateurs.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} Les informations de l'échange.
   */
  async swapShifts(demandId) {
    const response = await fetch(`${API_URL}/substitution/${demandId}/swap`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Marque une demande comme intéressante.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} Les informations de la demande.
   */
  async markInterest(demandId) {
    const response = await fetch(`${API_URL}/substitution/${demandId}/interest`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Annule l'acceptation d'une demande de substitution.
   * @param {string} id - L'ID de la substitution.
   * @returns {Promise<Object>} La substitution mise à jour.
   */
  async unacceptDemand(id) {
    const response = await fetch(`${API_URL}/substitution/${id}/unaccept`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
