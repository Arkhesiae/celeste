/**
 * Service pour gérer les appels API liés aux notifications.
 * @module notificationService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const notificationService = {
  /**
   * Récupère toutes les notifications.
   * @returns {Promise<Array>} Liste des notifications.
   */
  async getNotifications(userId) {
    const response = await fetch(`${API_URL}/notifications/${userId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Marque une notification comme lue.
   * @param {string} id - L'ID de la notification.
   * @returns {Promise<Object>} La notification mise à jour.
   */
  async markAsRead(id) {
    const response = await fetch(`${API_URL}/notifications/${id}/read`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Marque toutes les notifications comme lues.
   * @returns {Promise<void>}
   */
  async markAllAsRead() {
    const response = await fetch(`${API_URL}/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async clearNotifications(userId) {
    try {
      const response = await fetch(`${API_URL}/notifications/${userId}/clear`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression des notifications');
      }
      return await response.json();
    } catch (error) {
      console.error('Erreur service notifications:', error);
      throw error;
    }
  }
}; 