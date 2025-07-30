import { API_URL, handleResponse, getAuthHeaders } from '@/config/api';

export const ticketService = {
  async fetchTickets() {
    const response = await fetch(`${API_URL}/tickets`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async createTicket(ticketData) {
    const response = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(ticketData)
    });
    return handleResponse(response);
  },

  async markAsRead(ticketId) {
    const response = await fetch(`${API_URL}/tickets/${ticketId}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async deleteTicket(ticketId) {
    const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  }
}; 