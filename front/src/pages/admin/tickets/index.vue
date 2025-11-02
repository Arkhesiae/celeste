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
    "test": "yeet"
  }
}
</route>

<script setup>
import { ref, computed } from 'vue';
import { useTicketStore } from '@/stores/ticketStore';
import TicketList from '@/components/Tickets/TicketList.vue';


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

const openTickets = computed(() => ticketStore.sortedTickets.filter(ticket => !ticket.archived));

const filteredTickets = computed(() => {
  let tickets = openTickets.value;

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
</script>
