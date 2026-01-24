import { apiFetch } from '../config/api';

export const ruleService = {
  async getAllRules (centerId) {
    const response = await apiFetch(`/rules?centerId=${centerId}`, {
      method: 'GET',
    });
    return response;
  },

  async updateRule (name, centerId, data) {
    const response = await apiFetch(`/rules/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, centerId })
    });
    return response;
  },

  async toggleLock (name, locked) {
    const response = await apiFetch(`/rules/${name}/lock`, {
      method: 'PUT',
      body: JSON.stringify({ locked })
    });
    return response;
  },

  async resetRule (name, centerId) {
    const response = await apiFetch(`/rules/${name}?centerId=${centerId}`, {
      method: 'DELETE',
    });
    return response;
  },

}; 