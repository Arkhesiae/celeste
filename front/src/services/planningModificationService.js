/**
 * Service pour gérer les appels API liés aux modifications de planning.
 * @module planningModificationService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const planningModificationService = {
  /**
   * Crée une nouvelle modification de planning.
   * @param {Object} modificationData - Les données de la modification
   * @param {string} modificationData.type - Type de modification ('absence', 'custom', 'selectedVariation')
   * @param {string} modificationData.date - Date de la modification (ISO string)
   * @param {boolean} [modificationData.isOff] - Indique si l'utilisateur est en congé
   * @param {string} [modificationData.comment] - Commentaire
   * @param {string} modificationData.centerId - ID du centre
   * @param {string} [modificationData.teamId] - ID de l'équipe
   * @param {string} [modificationData.shift] - ID du shift
   * @param {string} [modificationData.selectedVariation] - ID de la variation sélectionnée
   * @returns {Promise<Object>} La modification créée
   */
  async registerModification(modificationData) {
    const response = await fetch(`${API_URL}/planning-modifications/register`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(modificationData)
    });
    return handleResponse(response);
  },

}