import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ticketService } from '@/services/ticketService';


export const useTicketStore = defineStore('ticket', () => {
  // State
  const tickets = ref([]);
  const loading = ref(false);

  // Getters
  const unreadCount = computed(() => 
    tickets.value.filter(ticket => !ticket.isRead).length
  );
  
  const sortedTickets = computed(() => 
    [...tickets.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  );

  // Actions
  async function fetchTickets() {
    loading.value = true;
    try {
      tickets.value = await ticketService.fetchTickets();
    } catch (err) {
      // Error handling removed
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(ticketData) {
    loading.value = true;
    try {
      const createdTicket = await ticketService.createTicket(ticketData);
      tickets.value.unshift(createdTicket);
      return createdTicket;
    } catch (err) {
      console.error(err); 
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(ticketId) {
    try {
      const updatedTicket = await ticketService.markAsRead(ticketId);
      await fetchTickets();
    } catch (err) {
      throw err;
    }
  }

  async function deleteTicket(ticketId) {
    try {
      await ticketService.deleteTicket(ticketId);
      await fetchTickets();
    } catch (err) {
      throw err;
    }
  }

  async function updateTicketStatus(ticketId, status) {
    try {
      await ticketService.updateTicketStatus(ticketId, status);
      await fetchTickets();
    } catch (err) {
      throw err;
    }
  }

  async function replyToTicket(ticketId, content) {
    try {
      const updatedTicket = await ticketService.sendTicketReply(ticketId, content);
      tickets.value = tickets.value.map(ticket => ticket._id === ticketId ? updatedTicket : ticket);
      return updatedTicket;
    } catch (err) {
      throw err;
    }
  }

  async function markReplySent(ticketId) {
    try {
      await ticketService.markReplySent(ticketId);
      await fetchTickets();
    } catch (err) {
      throw err;
    }
  }

  return {
    // State
    tickets,
    loading,
    // Getters
    unreadCount,
    sortedTickets,
    // Actions
    fetchTickets,
    createTicket,
    markAsRead,
    deleteTicket,
    replyToTicket,
    updateTicketStatus,
    markReplySent
  };
}); 