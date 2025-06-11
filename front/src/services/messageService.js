import { API_URL, handleResponse, getAuthHeaders } from '@/config/api';

export const messageService = {
  async fetchMessages() {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createMessage(messageData) {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(messageData)
    });
    return handleResponse(response);
  },

  async markAsRead(messageId) {
    const response = await fetch(`${API_URL}/messages/${messageId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async deleteMessage(messageId) {
    const response = await fetch(`${API_URL}/messages/${messageId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
}; 