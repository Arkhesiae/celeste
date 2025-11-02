<template>
  <div>
    <TicketList
      :tickets="filteredTickets"
      :loading="loading"
      @open-ticket="$emit('open-ticket', $event)"
    />
  </div>
</template>

<route lang="json">
{
  "meta": {
    "test": false
  }
}
</route>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { ticketService } from '@/services/ticketService';
import TicketList from '@/components/Tickets/TicketList.vue';
import { useTicketStore } from '@/stores/ticketStore';

const ticketStore = useTicketStore();

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['open-ticket']);

const archivedTickets = computed(() => ticketStore.sortedTickets.filter(ticket => ticket.archived));

const filteredTickets = computed(() => {
  let tickets = archivedTickets.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (props.filters.type) {
    tickets = tickets.filter(ticket => ticket.type === props.filters.type);
  }

  if (props.filters.status !== 'all') {
    tickets = tickets.filter(ticket => ticket.status === props.filters.status);
  }

  if (props.filters.search) {
    const search = props.filters.search.toLowerCase();
    tickets = tickets.filter(ticket => 
      ticket.title.toLowerCase().includes(search) ||
      ticket.content.toLowerCase().includes(search) ||
      ticket.senderEmail.toLowerCase().includes(search)
    );
  }

  return tickets;
});

// onMounted(async () => {
//   try {
//     archivedTickets.value = await ticketService.fetchTickets(true);
//   } catch (error) {
//     console.error('Erreur lors du chargement des tickets archivés', error);
//   }
// });
</script>
