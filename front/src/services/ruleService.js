import { API_URL } from '@/config/api';
import { handleResponse, getAuthHeaders } from '@/config/api';

export const ruleService = {
  async getAllRules() {
    const response = await fetch(`${API_URL}/rules`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async updateRule(name, data) {
    const response = await fetch(`${API_URL}/rules/${name}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async initializeRules() {
    const response = await fetch(`${API_URL}/rules/initialize`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  }
}; 