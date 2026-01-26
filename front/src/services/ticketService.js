import { apiFetch } from '@/config/api';

export const ticketService = {
  async createTicket(ticketData) {
    console.log(ticketData);
    const response = await apiFetch(`/tickets/create`, {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });
    return response;
  },

  async markAsRead(ticketId) {
    const response = await apiFetch(`/tickets/${ticketId}/read`, {
      method: 'PUT',
    });
    return response;
  },

  async deleteTicket(ticketId) {
    const response = await apiFetch(`/tickets/${ticketId}`, {
      method: 'DELETE',
    });
    return response;
  },

  async updateTicketStatus(id, ticketStatus) {
    const response = await apiFetch(`/tickets/status/${id}`, {
      method: 'POST',
      body: JSON.stringify({ ticketStatus })
    });
    return response;
  },

  async markReplySent(ticketId) {
    const response = await apiFetch(`/tickets/${ticketId}/reply-sent`, {
      method: 'PUT',
    });
    return response;
  },

  async sendTicketReply(ticketId, content) {
    const response = await apiFetch(`/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    return response;
  },

  async fetchTickets(archived = false) {
    const response = await apiFetch(`/tickets?archived=${archived}`, {
      method: 'GET',
    });
    return response;
  },

  async archiveTicket(ticketId) {
    const response = await apiFetch(`/tickets/${ticketId}/archive`, {
      method: 'PUT',
    });
    return response;
  },

  async restoreTicket(ticketId) {
    const response = await apiFetch(`/tickets/${ticketId}/restore`, {
      method: 'PUT',
    });
    return response;
  }
}; 