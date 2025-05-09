/**
 * Service pour gérer les appels API liés aux créneaux horaires (vacation).
 * @module vacationService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';
import { calculateRestDelay } from '../utils/shiftUtils';


export const vacationService = {
  /**
   * Récupère les jours de travail d'un utilisateur pour une période donnée
   * @param {string} userId - L'ID de l'utilisateur
   * @param {Array<string>} dates - Liste des dates à vérifier
   * @returns {Promise<Array>} Liste des créneaux horaires
   */
  async fetchWorkdaysOfUser(userId, dates) {
    const response = await fetch(`${API_URL}/users/${userId}/get-shifts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dates }),
    });
    return handleResponse(response);
  },

  /**
   * Récupère les vacations d'un utilisateur pour une période donnée
   * @param {string} userId - L'ID de l'utilisateur
   * @param {Array<string>} dates - Liste des dates à vérifier
   * @returns {Promise<Array>} Liste des créneaux horaires
   */
  async fetchVacationsOfUser(userId, dates) {
    const response = await fetch(`${API_URL}/users/${userId}/get-shifts-with-substitutions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ dates }),
    });
    return handleResponse(response);
  },

  /**
   * Récupère les vacations adjacentes à une date donnée
   * @param {string} userId - L'ID de l'utilisateur
   * @param {string} date - Date de référence
   * @returns {Promise<Object>} Objet contenant les vacations précédente et suivante
   */
  async getAdjacentVacations(userId, date) {
    if (!date) return { prev: null, next: null };

    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    try {
      const response = await fetch(`${API_URL}/users/${userId}/get-shifts`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          dates: [
            prevDate.toISOString(),
            nextDate.toISOString()
          ]
        }),
      });

      if (!response.ok) {
        throw new Error("Échec lors de la récupération des vacations adjacentes");
      }

      const data = await handleResponse(response);
      return {
        prev: data.find(v => new Date(v.date).getTime() === prevDate.getTime()),
        next: data.find(v => new Date(v.date).getTime() === nextDate.getTime())
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des vacations adjacentes:", error);
      return { prev: null, next: null };
    }
  }
}
