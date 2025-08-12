/**
 * Service pour gérer les appels API liés aux statistiques.
 * @module statService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const statService = {
  /**
   * Récupère toutes les statistiques de l'application.
   * @returns {Promise<Object>} Les statistiques (totalUsers, totalCenters, totalSubstitutions).
   */
  async getStats() {
    const response = await fetch(`${API_URL}/stats`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère le nombre total d'utilisateurs.
   * @returns {Promise<number>} Le nombre total d'utilisateurs.
   */
  async getTotalUsers() {
    const response = await fetch(`${API_URL}/stats/users`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère le nombre total de centres.
   * @returns {Promise<number>} Le nombre total de centres.
   */
  async getTotalCenters() {
    const response = await fetch(`${API_URL}/stats/centers`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère le nombre total de substitutions.
   * @returns {Promise<number>} Le nombre total de substitutions.
   */
  async getTotalSubstitutions() {
    const response = await fetch(`${API_URL}/stats/substitutions`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
};
