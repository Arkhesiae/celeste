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
    console.log(ticketData);
    const response = await fetch(`${API_URL}/tickets/create`, {
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
  },

  async updateTicketStatus(id, ticketStatus) {
    console.log("azeaze");
    console.log(id, ticketStatus);
    const response = await fetch(`${API_URL}/tickets/status/${id}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ticketStatus })
    });
    return handleResponse(response);
  },

  async markReplySent(ticketId) {
    const response = await fetch(`${API_URL}/tickets/${ticketId}/reply-sent`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  async sendTicketReply(ticketId, content) {
    const response = await fetch(`${API_URL}/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content })
    });
    return handleResponse(response);
  }
}; 