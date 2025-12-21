import { apiFetch } from '../config/api';

export const ruleService = {
  async getAllRules() {
    const response = await apiFetch(`/rules`, {
      method: 'GET',
    });
    return response;
  },

  async updateRule(name, data) {
    const response = await apiFetch(`/rules/${name}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return response;
  },

  async initializeRules() {
    const response = await apiFetch(`/rules/initialize`, {
      method: 'POST',
    });
    return response;
  },

  async resetRules() {
    const response = await apiFetch(`/rules/reset`, {
      method: 'POST',
    });
    return response;
  }
}; 