<template>
  <v-menu>
    <template v-slot:activator="{ props }">
      <v-chip
        v-bind="props"
        size="x-small"
        :variant="isDarkTheme ? 'outlined' : 'tonal'"
        rounded="lg"
        :color="getStatusColor(status)"
        
        class="cursor-pointer"
        @click.stop
      >
      <v-icon v-if="prependIcon" size="small" class="mr-1">mdi-chevron-down</v-icon>
        {{ getStatusLabel(status) }}
      </v-chip>
    </template>
    <v-list>
      <v-list-item
        v-for="statusOption in statusOptions"
        :key="statusOption.value"
        @click="updateStatus(statusOption.value)"
      >
        <v-list-item-title>{{ statusOption.label }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import { useTicketStore } from '@/stores/ticketStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useTheme } from 'vuetify';

const ticketStore = useTicketStore();
const snackbarStore = useSnackbarStore();
const theme = useTheme();

const isDarkTheme = computed(() => theme.global.current.value.dark);

const props = defineProps({
  ticketId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'small'
  },
  prependIcon: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['status-updated']);

const statusOptions = [
  { value: 'new', label: 'A traiter' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'closed', label: 'Fermé' }
];

const getStatusColor = (status) => {
  switch (status) {
    case 'new':
      return 'rgba(var(--v-theme-new),1)';
    case 'in_progress':
      return 'rgba(var(--v-theme-pending),1)';
    case 'closed':
      return 'rgba(100,100,100,1)';
    default:
      return 'rgba(100,100,100,1)';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'new':
      return 'A traiter';
    case 'in_progress':
      return 'En cours';
    case 'closed':
      return 'Fermé';
  
  }
};

const updateStatus = async (newStatus) => {
  try {
    await ticketStore.updateTicketStatus(props.ticketId, newStatus);
 
    emit('status-updated', newStatus);
  } catch (error) {
    snackbarStore.showError('Erreur lors de la mise à jour du statut : ' + error, 'onError', 'mdi-alert-circle');
  }
};
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
