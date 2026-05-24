/**
 * Service for public announcement API calls (in-app dashboard banners).
 * @module publicAnnouncementService
 */
import { apiFetch } from '../config/api';

export const publicAnnouncementService = {
  /**
   * Fetch active announcements for the current user's dashboard.
   * Returns { permanentAnnouncements, nonPermanentAnnouncements }.
   */
  async getActive() {
    return apiFetch('/public-announcements/active', { method: 'GET' });
  },

  /**
   * Mark an announcement as acknowledged (dismissed) by the current user.
   * @param {string} id - Announcement ID
   */
  async acknowledge(id) {
    return apiFetch(`/public-announcements/${id}/acknowledge`, { method: 'POST' });
  },

  /**
   * Admin — fetch all announcements (paginated).
   * @param {Object} params - { page, limit, sortBy, sortOrder }
   */
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/public-announcements${query ? '?' + query : ''}`, { method: 'GET' });
  },

  /**
   * Admin — create a new public announcement.
   * @param {Object} data - Announcement fields
   */
  async create(data) {
    return apiFetch('/public-announcements', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Admin — update an existing announcement.
   * @param {string} id - Announcement ID
   * @param {Object} data - Fields to update
   */
  async update(id, data) {
    return apiFetch(`/public-announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Admin — delete an announcement.
   * @param {string} id - Announcement ID
   */
  async remove(id) {
    return apiFetch(`/public-announcements/${id}`, { method: 'DELETE' });
  }
};
