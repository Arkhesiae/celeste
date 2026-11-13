import { apiFetch } from '../config/api';

export const messageService = {
  async fetchMessages() {
    const response = await apiFetch(`/message`, {
      method: 'GET',
    });
    return response;
  },

  async createMessage(messageData) {
    const response = await apiFetch(`/message`, {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
    return response;
  },

  async markAsRead(messageId) {
    const response = await apiFetch(`/message/${messageId}/read`, {
      method: 'PUT',
    });
    return response;
  },

  async deleteMessage(messageId) {
    const response = await apiFetch(`/message/${messageId}`, {
      method: 'DELETE',
    });
    return response;
  }
}; 