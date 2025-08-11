import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ticketService } from '@/services/ticketService';


export const useTicketStore = defineStore('ticket', () => {
  // State
  const tickets = ref([]);
  const loading = ref(false);
  const error = ref(null);

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
      error.value = null;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(ticketData) {
    loading.value = true;
    try {
      const createdTicket = await ticketService.createTicket(ticketData);
      tickets.value.unshift(createdTicket);
      error.value = null;
      return createdTicket;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function markAsRead(ticketId) {
    try {
      const updatedTicket = await ticketService.markAsRead(ticketId);
      await fetchTickets();
     
      error.value = null;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  async function deleteTicket(ticketId) {
    try {
      await ticketService.deleteTicket(ticketId);
     
      await fetchTickets();
      error.value = null;
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  }

  return {
    // State
    tickets,
    loading,
    error,
    // Getters
    unreadCount,
    sortedTickets,
    // Actions
    fetchTickets,
    createTicket,
    markAsRead,
    deleteTicket
  };
}); 