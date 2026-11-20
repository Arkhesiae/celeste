/**
 * Service for banner API calls (in-app dashboard banners).
 * @module bannerService
 */
import { apiFetch } from '../config/api';

export const bannerService = {
  /**
   * Fetch active banners for the current user's dashboard.
   * Returns { permanentBanners, nonPermanentBanners }.
   */
  async getActive() {
    return apiFetch('/banner/active', { method: 'GET' });
  },

  /**
   * Mark a banner as acknowledged (dismissed) by the current user.
   * @param {string} id - Banner ID
   */
  async acknowledge(id) {
    return apiFetch(`/banner/${id}/acknowledge`, { method: 'POST' });
  },

  /**
   * Admin — fetch all banners (paginated).
   * @param {Object} params - { page, limit, sortBy, sortOrder }
   */
  async getAll(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/banner${query ? '?' + query : ''}`, { method: 'GET' });
  },

  /**
   * Admin — create a new banner.
   * @param {Object} data - Banner fields
   */
  async create(data) {
    return apiFetch('/banner', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin — update an existing banner.
   * @param {string} id - Banner ID
   * @param {Object} data - Fields to update
   */
  async update(id, data) {
    return apiFetch(`/banner/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Admin — delete a banner.
   * @param {string} id - Banner ID
   */
  async remove(id) {
    return apiFetch(`/banner/${id}`, { method: 'DELETE' });
  },
};
