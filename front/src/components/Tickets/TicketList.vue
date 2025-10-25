<template>
  <v-list v-if="!loading" bg-color="transparent" class="ticket-list pa-0 ma-0">
    <v-list-item color="surfaceContainer" v-for="ticket in tickets" :key="ticket._id" rounded="lg"
      :class="{ 'unread': !ticket.isRead }" class="mb-2 py-3 ticket-item" @click="$emit('open-ticket', ticket)">
   
      <div class="d-flex align-center justify-space-between ga-1">
      <div class="d-flex align-start  ga-1 flex-column">
      <div class="title-container d-flex align-center flex ga-1">
        <div class=" d-flex align-center flex-wrap ga-1">
          <div class="d-flex align-center ga-1">
            <v-icon size="16" :icon="getTicketIcon(ticket.type)" :color="getTicketColor(ticket.type)"></v-icon>
            <span class="text-truncate title text-h7">{{ ticket.title }}</span>
            <div class="" v-if="ticket.replySent">
      
      <v-chip size="x-small" color="done" prepend-icon="mdi-check" variant="tonal" rounded="lg">
        Réponse
      </v-chip>
      </div>
          </div>


          <!-- Chips avec responsive design -->
          <div class="d-flex align-center ga-1">
       
            <div class="pr-16 align-center d-flex  ga-1">

              <v-chip v-if="ticket.adminType === 'local' && !xs" size="x-small" rounded="lg"
                color="primary">
                Local
              </v-chip>

              <v-chip size="x-small" rounded="lg" color="onBackground">

                {{ ticket.centerId?.name }}

              </v-chip>
            </div>
          </div>
        </div>
      </div>
        <div class="subtitle-container mt-1">
          <div class="d-flex align-center opacity-50 text-email">
            <v-icon size="small" class="mr-1">mdi-email-outline</v-icon>
            {{ticket.senderEmail}}
          </div>
        </div>
      </div>


          <div class="d-flex align-end justify-space-between flex-0-0 h-100 " :class="'flex-column ga-1'">
            <StatusChip :ticket-id="ticket._id" :status="ticket.status" v-if="!smAndDown"
              :prepend-icon="true" />

            <MobileStatusChip @click.stop="openSelector(ticket._id)" :status="ticket.status" :ticket-id="ticket._id" v-else/>
          

            <div class="d-flex align-center ga-0">
              <v-chip size="x-small" variant="outlined" class="opacity-50" color="onSurface"
              :prepend-icon="xs ? undefined : 'mdi-clock-outline'" rounded="lg">
              {{ xs ? formatDateExtraShort(ticket.createdAt) : formatDateShort(ticket.createdAt) }}
            </v-chip>
              <!-- <v-icon size="small" class="mx-1">mdi-identifier</v-icon>
              <span class="text-subtitle-2 id">{{ ticket._id.slice(-6) }}</span> -->
            </div>

          </div>
  
    </div>
    </v-list-item>
    <v-list-item v-if="tickets.length === 0" class="text-center py-4">
      <v-list-item-title class="text-grey">
        Aucun ticket trouvé
      </v-list-item-title>
    </v-list-item>
  </v-list>
  <v-progress-circular v-else indeterminate color="primary" class="ma-4"></v-progress-circular>
  <!-- Selector -->
   <v-dialog v-model="showSelector" width="300" >
    <EntitySelector title="Mettre à jour le statut" v-model="selectedTicketStatus" :items="statusOptions" itemSubtitle="subtitle" itemKey="value" itemTitle="label" @update:modelValue="updateStatus" />
   </v-dialog>

  <!-- Progress Circular -->

</template>

<script setup>
import { useDisplay } from 'vuetify';
import StatusChip from './StatusChip.vue';
import { useTicketStore } from '@/stores/ticketStore';
import EmailButton from './EmailButton.vue';

const { smAndDown, xs } = useDisplay();

const ticketStore = useTicketStore();



defineProps({
  tickets: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

defineEmits(['open-ticket', 'mark-read']);

const selectedTicketStatus = ref(null);
const selectedTicket = ref(null);
const showSelector = ref(false);

const openSelector = (ticketId) => {
  selectedTicket.value = ticketId;
  showSelector.value = true;
  selectedTicketStatus.value = { value: ticketStore.tickets.find(ticket => ticket._id === ticketId).status }
};

const statusOptions = [
  { value: 'new', label: 'A traiter', subtitle: 'Nouveau ticket' },
  { value: 'in_progress', label: 'En cours', subtitle: 'En cours de traitement' },
  { value: 'done', label: 'Traité', subtitle: 'Traité par l\'administrateur' },
  { value: 'closed', label: 'Fermé', subtitle: 'Fermé' }
];

const updateStatus = async (newStatus) => {
  try {
    await ticketStore.updateTicketStatus(selectedTicket.value, newStatus.value);
 
    showSelector.value = false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut : ' + error);
  }
};

const ticketTypes = [
  { title: 'Demande d\'assistance', value: 'assistance' },
  { title: 'Signaler un bug', value: 'review' },
  { title: 'Autre', value: 'other' }
];


const getTicketIcon = (type) => {
  switch (type) {
    case 'assistance':
      return 'mdi-help-circle';
    case 'review':
      return 'mdi-bug';
    default:
      return 'mdi-email';
  }
};

const getTicketColor = (type) => {
  switch (type) {
    case 'assistance':
      return 'onBackground';
    case 'review':
      return 'onBackground';
    default:
      return 'primary';
  }
};

const getTicketTypeLabel = (type) => {
  const found = ticketTypes.find(t => t.value === type);
  return found ? found.title : type;
};

const getTicketTypeLabelShort = (type) => {
  switch (type) {
    case 'assistance':
      return 'Assistance';
    case 'review':
      return 'Bug';
    case 'other':
      return 'Autre';
    default:
      return type;
  }
};

const getCenterShortName = (centerName) => {
  if (!centerName) return '';
  // Prendre les premières lettres ou utiliser un acronyme
  return centerName.length > 8
    ? centerName.substring(0, 8) + '...'
    : centerName;
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateShort = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateExtraShort = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit'
  });
};



</script>

<style scoped>
.ticket-item {
  border-radius: 16px !important;
  transition: all 0.2s ease;
  background-color: rgba(var(--v-theme-surfaceContainerHigh), 0.5);
  border: 1px solid rgba(var(--v-theme-surfaceContainerHigh), 0.1);
}

.ticket-item:hover {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);

}

.unread {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.cursor-pointer {
  cursor: pointer;
}

.hover-underline:hover {
  text-decoration: underline;
}

/* Responsive adjustments */
@media (max-width: 599px) {
  .ticket-item {
    padding: 8px !important;
  }

  .title {
    font-size: 0.75rem !important;
    line-height: 1.2 !important;
  }

  

  .id {
    font-size: 0.75rem !important;
  }

}

.text-email {
    font-size: 0.75rem !important;
  }
.id {
  opacity: 0.5;
  font-size: 0.75rem !important;
}
/* Ensure chips wrap properly on small screens */
.v-list-item-title .d-flex.flex-wrap {
  flex-wrap: wrap;
  gap: 4px;
}
</style>
