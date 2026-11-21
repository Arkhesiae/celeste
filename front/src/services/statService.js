/**
 * Service pour gérer les appels API liés aux statistiques.
 * @module statService
 */
import { apiFetch } from '../config/api';

export const statService = {
  /**
   * Récupère toutes les statistiques de l'application.
   * @returns {Promise<Object>} Les statistiques (totalUsers, totalCenters, totalDemands).
   */
  async getStats() {
    const response = await apiFetch(`/stat`, {
      method: 'GET',
    });
    return response;
  },
};
