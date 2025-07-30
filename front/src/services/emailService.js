/**
 * Service pour gérer les appels API liés aux emails et annonces.
 * @module emailService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const emailService = {
  /**
   * Récupère la liste des templates disponibles.
   * @returns {Promise<Array>} Liste des templates.
   */
  async getTemplates() {
    const response = await fetch(`${API_URL}/announcements/templates`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère le nombre total d'utilisateurs.
   * @returns {Promise<number>} Le nombre d'utilisateurs.
   */
  async getUserCount() {
    const response = await fetch(`${API_URL}/announcements/users-count`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Envoie une annonce en masse.
   * @param {Object} announcementData - Les données de l'annonce.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async sendAnnouncement(announcementData) {
    const response = await fetch(`${API_URL}/announcements/send`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(announcementData)
    });
    return handleResponse(response);
  },

  /**
   * Récupère l'historique des annonces.
   * @param {Object} params - Les paramètres de filtrage.
   * @returns {Promise<Object>} L'historique des annonces.
   */
  async getHistory(params = {}) {
    const queryParams = new URLSearchParams(params);
    const response = await fetch(`${API_URL}/announcements/history?${queryParams}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère les statistiques des annonces.
   * @returns {Promise<Object>} Les statistiques.
   */
  async getStats() {
    const response = await fetch(`${API_URL}/announcements/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Supprime une annonce.
   * @param {string} id - L'ID de l'annonce à supprimer.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async deleteAnnouncement(id) {
    const response = await fetch(`${API_URL}/announcements/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Récupère un template HTML depuis le backend.
   * @param {string} templateType - Le type de template.
   * @param {Object} data - Les données pour le template.
   * @returns {Promise<string>} Le HTML du template.
   */
  async getTemplatePreview(templateType, data) {
    const response = await fetch(`${API_URL}/announcements/templates/${templateType}/preview`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  /**
   * Valide les données d'une annonce.
   * @param {Object} data - Les données à valider.
   * @returns {Object} L'objet de validation avec isValid et errors.
   */
  validateAnnouncementData(data) {
    const errors = [];

    if (!data.templateType) {
      errors.push('Le type de template est requis');
    }

    if (!data.message) {
      errors.push('Le message est requis');
    } else if (data.message.length < 10) {
      errors.push('Le message doit contenir au moins 10 caractères');
    }

    if (data.templateType === 'maintenance' && data.duration && data.duration.length < 3) {
      errors.push('La durée doit contenir au moins 3 caractères');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Formate les données pour l'affichage.
   * @param {Object} announcement - L'annonce à formater.
   * @returns {Object} L'annonce formatée.
   */
  formatAnnouncementData(announcement) {
    return {
      ...announcement,
      formattedSentAt: this.formatDate(announcement.sentAt),
      successRate: this.calculateSuccessRate(announcement.results),
      senderName: this.formatSenderName(announcement.sentBy)
    };
  },

  /**
   * Formate une date.
   * @param {string|Date} date - La date à formater.
   * @returns {string} La date formatée.
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Calcule le taux de succès.
   * @param {Object} results - Les résultats de l'envoi.
   * @returns {number} Le taux de succès en pourcentage.
   */
  calculateSuccessRate(results) {
    if (!results || results.total === 0) return 0;
    return Math.round((results.sent / results.total) * 100);
  },

  /**
   * Formate le nom de l'expéditeur.
   * @param {Object} sentBy - Les informations de l'expéditeur.
   * @returns {string} Le nom formaté.
   */
  formatSenderName(sentBy) {
    if (!sentBy) return 'N/A';
    return `${sentBy.name} ${sentBy.lastName}`;
  }
}; 