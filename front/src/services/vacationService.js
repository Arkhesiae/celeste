/**
 * Service pour gérer les appels API liés aux créneaux horaires (vacation).
 * @module vacationService
 */
import { apiFetch } from '../config/api';

export const vacationService = {
  /**
   * Récupère les vacations d'un utilisateur pour une période donnée
   * @param {string} userId - L'ID de l'utilisateur
   * @param {Array<string>} dates - Liste des dates à vérifier
   * @returns {Promise<Array>} Liste des créneaux horaires
   */
  async fetchVacationsOfUser(userId, dates) {
    const query = new URLSearchParams({ startDate: dates.startDate, endDate: dates.endDate });
    const response = await apiFetch(`/user/${userId}/get-shifts-with-substitutions?${query}`, {
      method: 'GET',
    });
    return response;
  },

};
