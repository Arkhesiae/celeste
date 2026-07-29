/**
 * Service pour gérer les appels API liés aux substitutions.
 * @module substitutionService
 */
import { apiFetch } from '../config/api';

export const substitutionService = {
  /**
   * Récupère les demandes de substitution d'un centre et les marque comme vues.
   * @param {Object} dates - Objet contenant les dates de début et de fin
   * @param {string} dates.startDate - Date de début au format ISO
   * @param {string} dates.endDate - Date de fin au format ISO
   * @param {string} [status] - Statut optionnel pour filtrer les demandes ('open', 'accepted', 'completed', 'cancelled')
   * @returns {Promise<Array>} Liste des demandes de substitution
   */
  async fetchAndMarkAsSeen (dates, status) {
    // Vérifier que les dates sont définies
    if (!dates || !dates.startDate || !dates.endDate) {
      throw new Error('Les dates de début et de fin sont requises');
    }

    // Préparer le corps de la requête
    const requestBody = {
      startDate: dates.startDate,
      endDate: dates.endDate
    };

    // Ajouter le statut uniquement s'il est défini
    if (status && status !== 'undefined') {
      requestBody.status = status;
    }

    return apiFetch(`/substitution/center`, {
      method: 'POST',
      body: JSON.stringify(requestBody)
    });
  },

  /**
   * Récupère une substitution par son ID.
   * @param {string} id - L'ID de la substitution.
   * @returns {Promise<Object>} Les données de la substitution.
   */
  async getSubstitutionById(id) {
    const response = await apiFetch(`/substitution/${id}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Crée une nouvelle substitution.
   * @param {Object} substitutionData - Les données de la nouvelle substitution.
   * @returns {Promise<Object>} La substitution créée.
   */
  async createSubstitutionDemand(substitutionData) {
    const response = await apiFetch(`/substitution`, {
      method: 'POST',
      body: JSON.stringify(substitutionData)
    });
    return response;
  },

  /**
   * Met à jour une substitution.
   * @param {string} id - L'ID de la substitution.
   * @param {Object} substitutionData - Les nouvelles données de la substitution.
   * @returns {Promise<Object>} La substitution mise à jour.
   */
  async updateSubstitution(id, substitutionData) {
    const response = await apiFetch(`/substitution/${id}`, {
      method: 'PUT',
      body: JSON.stringify(substitutionData)
    });
    return response;
  },

  /**
   * Supprime une substitution.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<void>}
   */
  async cancelDemand(demandId) {
    const response = await apiFetch(`/substitution/${demandId}/cancel`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Accepte une demande de substitution.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} La substitution acceptée.
   */
  async acceptDemand(demandId) {
    const response = await apiFetch(`/substitution/${demandId}/accept`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Refuse une substitution.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} La substitution refusée.
   */
  async rejectSubstitution(demandId) {
    const response = await apiFetch(`/substitution/${demandId}/reject`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Récupère les substitutions d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Array>} Liste des substitutions de l'utilisateur.
   */
  async getUserSubstitutions(userId) {
    const response = await apiFetch(`/users/${userId}/substitution`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Vérifie le shift d'un utilisateur pour une date donnée.
   * @param {string} date - La date à vérifier.
   * @returns {Promise<Object>} Les informations du shift.
   */
  async checkUserShift(date) {
    const response = await apiFetch(`/substitution/check-shift/${date}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Échange les shifts entre deux utilisateurs.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} Les informations de l'échange.
   */
  async swapShifts(demandId) {
    const response = await apiFetch(`/substitution/${demandId}/swap`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Marque une demande comme intéressante.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} Les informations de la demande.
   */
  async markInterest(demandId) {
    const response = await apiFetch(`/substitution/${demandId}/interest`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Annule l'acceptation d'une demande de substitution.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} La substitution mise à jour.
   */
  async unacceptDemand(demandId) {
    const response = await apiFetch(`/substitution/${demandId}/withdraw`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Détecte les conflits de substitutions lors d'un changement d'équipe.
   * @param {Object} params - { userId, newTeamId, fromDate }
   * @returns {Promise<Object>} Liste des IDs de substitutions conflictuelles.
   */
  async detectTeamChangeConflicts(params) {
    const response = await apiFetch(`/substitution/detect-team-change-conflicts`, {
      method: 'POST',
      body: JSON.stringify(params)
    });
    return response;
  },

  /**
   * Recatégorise les substitutions ouvertes pour une date donnée.
   * @param {Array<string>} substitutionIds - Liste des IDs de substitutions à recatégoriser
   * @returns {Promise<Array>} Liste des substitutions recatégorisées
   */
  async recategorizeSubstitutions(substitutionIds) {
    const response = await apiFetch(`/substitution/recategorize`, {
      method: 'POST',
      body: JSON.stringify({ substitutionIds })
    });
    return response;
  },


  async fetchCompatibleSwitches(date) {
    const response = await apiFetch(`/substitution/compatible-switches/${date}`, {
      method: 'GET'
    });
    return response;
  },

  /**
   * Récupère toutes les demandes d'un centre pour les admins.
   * @param {string} centerId - L'ID du centre.
   * @returns {Promise<Array>} Liste de toutes les demandes du centre.
   */
  async fetchAllCenterDemands (centerId) {
    const response = await apiFetch(`/substitution/center/${centerId}/all`);
    return response;
  },

  /**
   * Récupère les compatibilités d'une demande.
   * @param {string} demandId - L'ID de la demande.
   * @returns {Promise<Object>} Les compatibilités de la demande.
   */
  async fetchCompatibility (demandId) {
    return apiFetch(`/substitution/compatibility/${demandId}`);
  },

  /**
   * Marque une demande comme consultée.
   * @param {string} demandId - L'ID de la demande de substitution.
   * @returns {Promise<Object>} La substitution mise à jour.
   */
  async consultDemand (demandId) {
    const response = await apiFetch(`/substitution/${demandId}/consult`, {
      method: 'POST',
    });
    return response;
  },

  /**
   * Envoie le mail automatique d'administration pour une demande.
   * @param {string} demandId - L'ID de la demande.
   * @returns {Promise<Object>} Résultat de l'envoi.
   */
  async sendAdminMail(demandId) {
    const response = await apiFetch(`/substitution/${demandId}/send-email`, {
      method: 'POST',
    });
    return response;
  }
};
