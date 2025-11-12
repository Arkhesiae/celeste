<template>
  <v-dialog v-model="isOpen" :fullscreen="smAndDown" max-width="800px">
    <v-card v-if="ticket" :rounded="smAndDown ? '' : 'xl'" class="pa-6">
      <v-card-title class="d-flex align-start pa-0 mb-4">
        <div class="d-flex  flex-column  justify-start align-start">
          <div class="d-flex align-center flex-wrap ga-1 ">
          <v-icon :icon="getTicketIcon(ticket.type)" :color="getTicketColor(ticket.type)" 
            size="small"></v-icon>

          <span class="text-truncate title">{{ ticket.title }}</span>
          <v-chip v-if="ticket.adminType === 'local' && !xs" size="x-small" rounded="lg"
                color="primary">
                Local
              </v-chip>

              <v-chip v-if="ticket.centerId?.name" size="x-small" rounded="lg" color="onBackground">

                {{ ticket.centerId?.name }}

              </v-chip>
         
    </div>
        

          <div class="d-flex align-center">
            <v-icon size="small" class="mr  -1">mdi-identifier</v-icon>
            <span class="text-body-2">{{ ticket._id.slice(-6) }}</span>
          </div>
              <!-- Date -->
        <div class="">
      
          <div class="d-flex align-center">
            <v-icon size="x-small" class="mr-1">mdi-clock-outline</v-icon>
            <span class="date">{{ formatDate(ticket.createdAt) }}</span>
          </div>
        </div>
        </div>
        <v-spacer></v-spacer>
        <div class="d-flex flex-column ga-1 justify-end align-end flex-0-0">
          <v-chip size="small" rounded="lg" v-if="ticket.type" :color="getTicketColor(ticket.type)" class="ml-2">
            {{ getTicketTypeLabel(ticket.type) }}
          </v-chip>



          <div class="flex-0-0">
            <StatusChip
              :ticket-id="ticket._id"
              :status="ticket.status"
              size="small"
              :prepend-icon="true"
            />
          </div>
        
        </div>

      </v-card-title>

      <!-- Actions (haut) -->
      <div class="d-flex justify-end ga-2 mb-4">
        <v-btn
          v-if="ticket.archived"
          color="onSurface"
          variant="outlined"
          prepend-icon="mdi-archive-arrow-up"
          @click="$emit('restore-ticket', ticket)"
          size="small"
        >
          Restaurer
        </v-btn>

        <v-btn
          v-if="!ticket.archived && ticket.status === 'closed'"
          color="onSurface"
          variant="outlined"
          prepend-icon="mdi-archive"
          @click="$emit('archive-ticket', ticket)"
          size="small"
        >
          Archiver
        </v-btn>
      </div>

      <v-card-text class="pa-0">


        <!-- Email avec possibilité de copier -->
        <div class="mb-4">
          <EmailButton 
            :email="ticket.senderEmail" 
            variant="button"
            height="32"
            size="small"
          />
        </div>

        <!-- Statut du ticket avec dropdown -->


        <!-- Chip "Réponse envoyée" -->
        

    

        <v-divider class="my-4"></v-divider>

        <!-- Contenu du ticket -->
        <div class="text-subtitle-2 mb-2">Ticket</div>
        <div class="bg-surfaceContainer pa-4 rounded-xl" style="font-size: 0.75rem !important; line-height: 1.2 !important;">
          <pre>{{ ticket.content }}</pre>
        </div>

        <!-- Réponses -->
        <div v-if="ticket.replies && ticket.replies.length > 0" class="mt-6">
       
          <div class="d-flex flex-column ga-3">
            <div 
              v-for="(reply, index) in ticket.replies" 
              :key="index"
              class="pa-6 rounded-xl"
              :class="reply.isFromAdmin ? 'bg-surfaceContainerHigh ml-8' : 'bg-surfaceContainer mr-8'"
            >
              <div class="d-flex align-center mb-2">
                <v-icon 
                  :icon="reply.isFromAdmin ? 'mdi-star-four-points' : 'mdi-account-outline'" 
                  size="x-small" 
                  class="mr-2"
      
                ></v-icon>
                <span class="text-caption font-weight-medium">
                  {{ reply.isFromAdmin ? 'Administrateur' : 'Utilisateur' }}
                </span>
                <v-spacer></v-spacer>
                <span class="text-caption text-medium-emphasis">
                  {{ formatDate(reply.createdAt) }}
                </span>
              </div>
              <div class="text-body-2" style="font-size: 0.75rem !important; line-height: 1.2 !important;"><pre>{{ reply.content }}</pre></div>
            </div>
          </div>
        </div>

        <!-- Bouton pour envoyer une réponse -->
        <div class="mt-4 d-flex justify-end">
          <v-spacer></v-spacer>
          <v-btn  size="small" color="surfaceContainerHighest" variant="flat" @click="openReplyDialog" style="border-radius: 16px !important;">
            <v-icon size="small">mdi-reply-outline</v-icon>
            <span class="ml-2 font-weight-medium" style="font-size: 0.710rem !important;">Répondre</span>
          </v-btn>
        </div>
      </v-card-text>

      <v-card-actions class="pa-0 mt-8">
        <v-spacer></v-spacer>
        <v-btn color="onSurface" variant="text" @click="$emit('close')">
          Fermer
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Dialog de réponse -->
    <ReplyDialog 
      v-model="showReplyDialog" 
      :ticket="ticket"
      @reply-sent="handleReplySent"
    />
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useTicketStore } from '@/stores/ticketStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useDisplay } from 'vuetify';
import StatusChip from './StatusChip.vue';
import EmailButton from './EmailButton.vue';
import ReplyDialog from './ReplyDialog.vue';

const { smAndDown } = useDisplay();

const ticketStore = useTicketStore();
const snackbarStore = useSnackbarStore();

const showReplyDialog = ref(false);

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  ticketId: {
    type: String,
    default: null
  }
});

const ticket = computed(() => {
  return ticketStore.tickets.find(ticket => ticket._id === props.ticketId);
});

const emit = defineEmits(['update:modelValue', 'close', 'delete-ticket', 'mark-read', 'archive-ticket', 'restore-ticket']);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

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




const formatDate = (date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};



const openReplyDialog = () => {
  showReplyDialog.value = true;
};


</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.title {
    font-size: 0.875rem !important;
  
  }

  .date {
    font-size: 0.75rem !important;
    opacity: 0.5;
  }

.ticket pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: inherit;
}

/* Responsive adjustments */
@media (max-width: 599px) {
  .ticket-item {
    padding: 8px !important;
  }
  
  .title {
    font-size: 0.805rem !important;
  
  }
  
 
}
</style>
