/**
 * Service pour gérer les appels API liés aux statistiques.
 * @module statService
 */
import { apiFetch } from '../config/api';

export const statService = {
  /**
   * Récupère toutes les statistiques de l'application.
   * @returns {Promise<Object>} Les statistiques (totalUsers, totalCenters, totalSubstitutions).
   */
  async getStats() {
    const response = await apiFetch(`/stats`, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Récupère le nombre total d'utilisateurs.
   * @returns {Promise<number>} Le nombre total d'utilisateurs.
   */
  async getTotalUsers() {
    const response = await apiFetch(`/stats/users`, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Récupère le nombre total de centres.
   * @returns {Promise<number>} Le nombre total de centres.
   */
  async getTotalCenters() {
    const response = await apiFetch(`/stats/centers`, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Récupère le nombre total de substitutions.
   * @returns {Promise<number>} Le nombre total de substitutions.
   */
  async getTotalSubstitutions() {
    const response = await apiFetch(`/stats/substitutions`, {
      method: 'GET',
    });
    return response;
  }
};
