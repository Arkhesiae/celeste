/**
 * Service pour gérer les appels API liés aux emails et annonces.
 * @module emailService
 */
import { apiFetch } from '../config/api';

export const emailService = {
  /**
   * Récupère le nombre total d'utilisateurs.
   * @returns {Promise<number>} Le nombre d'utilisateurs.
   */
  async getUserCount() {
    const response = await apiFetch(`/announcement/users-count`, {
      method: 'GET',
    });
    return response;
  },

  /**
   * Envoie une annonce en masse.
   * @param {Object} announcementData - Les données de l'annonce.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async sendAnnouncement(announcementData) {
    // Le périmètre est dans l'URL : /announcements/send = tous les centres (master), sinon un centre
    const { isGlobal, centerId, ...content } = announcementData;
    const url = isGlobal ? `/announcement/send` : `/announcement/center/${centerId}/send`;
    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(content),
    });
    return response;
  },

  /**
   * Récupère l'historique des annonces.
   * @param {Object} params - Les paramètres de filtrage.
   * @returns {Promise<Object>} L'historique des annonces.
   */
  async getHistory(params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await apiFetch(`/announcement/history?${queryParams}`, {
      method: 'GET',
    });
    return response;
  },
};
