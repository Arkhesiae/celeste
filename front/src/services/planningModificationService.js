/**
 * Service pour gérer les appels API liés aux modifications de planning.
 * @module planningModificationService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const planningModificationService = {
  /**
   * Crée une nouvelle modification de planning.
   * @param {Object} modificationData - Les données de la modification
   * @param {string} modificationData.type - Type de modification ('absence', 'off_day', 'custom_modification')
   * @param {string} modificationData.date - Date de la modification (ISO string)
   * @param {string} [modificationData.startTime] - Heure de début (HH:MM)
   * @param {string} [modificationData.endTime] - Heure de fin (HH:MM)
   * @param {string} [modificationData.comment] - Commentaire
   * @param {string} modificationData.centerId - ID du centre
   * @param {string} [modificationData.teamId] - ID de l'équipe
   * @returns {Promise<Object>} La modification créée
   */
  async createModification(modificationData) {
    const response = await fetch(`${API_URL}/planning-modifications`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(modificationData)
    });
    return handleResponse(response);
  },

  /**
   * Récupère les modifications d'un utilisateur.
   * @param {Object} [params] - Paramètres de filtrage
   * @param {string} [params.startDate] - Date de début (ISO string)
   * @param {string} [params.endDate] - Date de fin (ISO string)
   * @param {string} [params.status] - Statut de la modification
   * @returns {Promise<Array>} Liste des modifications
   */
  async getUserModifications(params = {}) {
    const url = new URL(`${API_URL}/planning-modifications/user`);
    
    // Ajouter les paramètres de requête
    if (params.startDate) url.searchParams.append('startDate', params.startDate);
    if (params.endDate) url.searchParams.append('endDate', params.endDate);
    if (params.status) url.searchParams.append('status', params.status);
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère toutes les modifications d'un centre (pour les admins).
   * @param {string} centerId - ID du centre
   * @param {Object} [params] - Paramètres de filtrage
   * @param {string} [params.startDate] - Date de début (ISO string)
   * @param {string} [params.endDate] - Date de fin (ISO string)
   * @param {string} [params.status] - Statut de la modification
   * @param {string} [params.type] - Type de modification
   * @returns {Promise<Array>} Liste des modifications
   */
  async getCenterModifications(centerId, params = {}) {
    const url = new URL(`${API_URL}/planning-modifications/center/${centerId}`);
    
    // Ajouter les paramètres de requête
    if (params.startDate) url.searchParams.append('startDate', params.startDate);
    if (params.endDate) url.searchParams.append('endDate', params.endDate);
    if (params.status) url.searchParams.append('status', params.status);
    if (params.type) url.searchParams.append('type', params.type);
    
    const response = await fetch(url, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère une modification spécifique.
   * @param {string} id - ID de la modification
   * @returns {Promise<Object>} La modification
   */
  async getModification(id) {
    const response = await fetch(`${API_URL}/planning-modifications/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Met à jour une modification.
   * @param {string} id - ID de la modification
   * @param {Object} modificationData - Nouvelles données
   * @param {string} [modificationData.startTime] - Nouvelle heure de début
   * @param {string} [modificationData.endTime] - Nouvelle heure de fin
   * @param {string} [modificationData.comment] - Nouveau commentaire
   * @returns {Promise<Object>} La modification mise à jour
   */
  async updateModification(id, modificationData) {
    const response = await fetch(`${API_URL}/planning-modifications/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(modificationData)
    });
    return handleResponse(response);
  },

  /**
   * Supprime une modification.
   * @param {string} id - ID de la modification à supprimer
   * @returns {Promise<void>}
   */
  async deleteModification(id) {
    const response = await fetch(`${API_URL}/planning-modifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Met à jour le statut d'une modification (pour les admins).
   * @param {string} id - ID de la modification
   * @param {string} status - Nouveau statut ('approved' ou 'rejected')
   * @param {string} [comment] - Commentaire optionnel
   * @returns {Promise<Object>} La modification mise à jour
   */
  async updateModificationStatus(id, status, comment = '') {
    const response = await fetch(`${API_URL}/planning-modifications/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, comment })
    });
    return handleResponse(response);
  },

  /**
   * Vérifie les conflits avec les substitutions pour une date donnée.
   * @param {string} date - Date à vérifier (ISO string)
   * @returns {Promise<boolean>} true s'il y a des conflits
   */
  async checkSubstitutionConflicts(date) {
    // Cette fonction utilise le service de substitution existant
    const substitutionService = await import('./substitutionService.js');
    try {
      const userSubstitutions = await substitutionService.substitutionService.getUserSubstitutions();
      return userSubstitutions.some(sub => {
        const subDate = new Date(sub.posterShift?.date || sub.accepterShift?.date);
        const checkDate = new Date(date);
        return subDate.toDateString() === checkDate.toDateString() && 
               ['open', 'accepted'].includes(sub.status);
      });
    } catch (error) {
      console.error('Erreur lors de la vérification des conflits:', error);
      return false;
    }
  }
};
