import { apiFetch } from '../config/api';

export const messageService = {
  async fetchMessages() {
    const response = await apiFetch(`/messages`, {
      method: 'GET',
    });
    return response;
  },

  async createMessage(messageData) {
    const response = await apiFetch(`/messages`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    return response;
  },

  async markAsRead(messageId) {
    const response = await apiFetch(`/messages/${messageId}/read`, {
      method: 'PUT',
    });
    return response;
  },

  async deleteMessage(messageId) {
    const response = await apiFetch(`/messages/${messageId}`, {
      method: 'DELETE',
    });
    return response;
  }
}; 