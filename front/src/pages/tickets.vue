<template>
  <v-container>

    <MainTitle title="Tickets" :subtitle="`${ticketStore.unreadCount} ticket(s) non lu(s)`" >
      <template v-slot:actions>
        <div class="d-flex ga-2 align-center">
        <!-- <v-btn
          color="surfaceContainerHigh"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="openNewTicketDialog"
          rounded="xl "
          height="32"
          size="small"
          >
            Nouveau ticket
          </v-btn> -->
          <v-btn
                prepend-icon="mdi-filter-variant"
                color="onBackground"
                @click="showFilters = !showFilters"
                rounded="lg"
                flat
                size="small"
                height="32"
              > Filtres
              </v-btn>
        </div>
      </template>
    </MainTitle>

    <v-row>
      <v-col cols="12">
        <v-card class="py-6 pa-0" rounded="xl" color="transparent" flat>


          <div class="d-flex justify-space-between align-start mb-4">
            <div>
          
              <v-chip
                v-if="ticketStore.unreadCount > 0"
                color="remplacement"
                class="mt-1"
                rounded="lg"
              >
                {{ ticketStore.unreadCount }} ticket(s) non lu(s)
              </v-chip>
            </div>
            <div class="d-flex ga-2 align-center">
            
            
            </div>
          </div>

          <!-- Filtres -->
          <v-slide-y-transition>
            <div v-if="showFilters" class="mb-4">
              <v-row>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="filters.type"
                    :items="ticketTypes"
                    label="Type de ticket"
                    clearable
                    variant="solo-filled"
                    flat
                    rounded="xl"
                    density="comfortable"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-select
                    v-model="filters.status"
                    :items="[
                      { title: 'Tous', value: 'all' },
                      { title: 'Non lus', value: 'unread' },
                      { title: 'Lus', value: 'read' }
                    ]"
                    label="Statut"
                    variant="solo-filled"
                    flat
                    rounded="xl"
                    density="comfortable"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="4">
                  <v-text-field
                    v-model="filters.search"
                    label="Rechercher"
                    prepend-inner-icon="mdi-magnify"
                    variant="solo-filled"
                    flat
                    rounded="xl"
                    density="comfortable"
                    clearable
                  ></v-text-field>
                </v-col>
              </v-row>
            </div>
          </v-slide-y-transition>

          <!-- Liste des tickets -->
          <v-list v-if="!ticketStore.loading" bg-color="transparent" class="ticket-list pa-0 ma-0 mt-16">
            <v-list-item
              color="surfaceContainerHigh"
              v-for="ticket in filteredTickets"
              :key="ticket._id"
              rounded="lg"
              :class="{ 'unread': !ticket.isRead }"
              class="mb-2 py-3 ticket-item"
              @click="openTicketDetails(ticket)"
            >
              <template v-slot:prepend>
                <v-badge
                  v-if="!ticket.isRead"
                  v-model="ticket.isRead"
                  color="primary"
                  class="mr-2"
                >
                  <v-icon
                    :icon="getTicketIcon(ticket.type)"
                    :color="getTicketColor(ticket.type)"
                  ></v-icon>
                </v-badge>
              </template>

              <v-list-item-title class="text-h6 d-flex align-center">
                {{ ticket.title }}
                <v-chip
                  v-if="ticket.type"
                  size="small"
                  rounded="lg"
                  :color="getTicketColor(ticket.type)"
                  class="ml-2"
                >
                  {{ getTicketTypeLabel(ticket.type) }}
                </v-chip>
                <v-chip
                  v-if="ticket.adminType === 'local'"
                  size="small"
                  rounded="lg"
                  color="primary"
                  class="ml-2"
                >
                  Local
                </v-chip>
                <v-chip
             
                  size="small"
                  rounded="lg"
                  color="primary"
                  class="ml-2"
                >
                  {{ ticket.centerId?.name }}
                </v-chip>
              </v-list-item-title>

              <v-list-item-subtitle class="mt-1">
                <div class="d-flex align-center opacity-50">
                  <v-icon size="small" class="mr-1">mdi-email-outline</v-icon>
                  {{ ticket.senderEmail }}
                  <v-icon size="small" class="mx-1">mdi-clock-outline</v-icon>
                  {{ formatDate(ticket.createdAt) }}
                </div>
              </v-list-item-subtitle>

              <template v-slot:append>
                <div class="d-flex align-center">
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click.stop="confirmDelete(ticket)"
                    class="mr-2"
                  ></v-btn>
                  <v-btn
                    v-if="!ticket.isRead"
                    icon="mdi-check"
                    variant="text"
                    color="primary"
                    @click.stop="markAsRead(ticket._id)"
                  ></v-btn>
                </div>
              </template>
            </v-list-item>

            <v-list-item v-if="filteredTickets.length === 0" class="text-center py-4">
              <v-list-item-title class="text-grey">
                Aucun ticket trouvé
              </v-list-item-title>
            </v-list-item>
          </v-list>

          <v-progress-circular
            v-else
            indeterminate
            color="primary"
            class="ma-4"
          ></v-progress-circular>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog de détails du ticket -->
    <v-dialog v-model="ticketDialog" max-width="600px">
      <v-card v-if="selectedTicket" rounded="xl" class="pa-6">
        <v-card-title class="d-flex align-center pa-0 mb-4  ">
          <v-icon
            :icon="getTicketIcon(selectedTicket.type)"
            :color="getTicketColor(selectedTicket.type)"
            class="mr-2"
          ></v-icon>
          {{ selectedTicket.title }}
          <v-spacer></v-spacer>
          <v-chip
            size="small"
            rounded="lg"
            v-if="selectedTicket.type"
            :color="getTicketColor(selectedTicket.type)"
            class="ml-2"
          >
            {{ getTicketTypeLabel(selectedTicket.type) }}
          </v-chip>
        </v-card-title>

        <v-card-text class="pa-0 pt-8">
          <div class="mb-4">
            <v-btn
              color="surfaceContainerHigh"
              variant="flat"
              @click="replyToTicket"
              rounded="xl"
              height="32"
              size="small"
            >
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-1">mdi-email-outline</v-icon>
              {{ selectedTicket.senderEmail }}
            </div>
            </v-btn>
         
          </div>

          <div class="mb-4">
            <div class="text-subtitle-2 mb-1">Date</div>
            <div class="d-flex align-center">
              <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>
              {{ formatDate(selectedTicket.createdAt) }}
            </div>
          </div>

          <v-divider class="my-4"></v-divider>

          <div class="text-subtitle-2 mb-2">Ticket</div>
          <div class="bg-surfaceContainerHigh pa-4 rounded-lg">
            {{ selectedTicket.content }}
          </div>
        </v-card-text>

        <v-card-actions class="pa-0 mt-8">
          <v-spacer></v-spacer>
          <v-btn
            color="error"
            variant="text"
            @click="confirmDelete(selectedTicket)"
          >
            Supprimer
          </v-btn>
          <v-btn
            v-if="!selectedTicket.isRead"
            color="primary"
            @click="markAsRead(selectedTicket._id)"
          >
            Marquer comme lu
          </v-btn>
          <v-btn
            color="grey"
            variant="text"
            @click="ticketDialog = false"
          >
            Fermer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog de confirmation de suppression -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card rounded="xl" class="pa-6">
        <v-card-title class="pa-0">Confirmer la suppression</v-card-title>
        <v-card-text class="pa-0">
          Êtes-vous sûr de vouloir supprimer ce ticket ?
        </v-card-text>
        <v-card-actions class="pa-0">
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="deleteDialog = false"
          >
            Annuler
          </v-btn>
          <v-btn
            color="error"
            @click="confirmDeleteAction"
            :loading="deleting"
          >
            Supprimer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useTicketStore } from '@/stores/ticketStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';
import { useSnackbarStore } from '@/stores/snackbarStore';

const ticketStore = useTicketStore();
const authStore = useAuthStore();
const router = useRouter();
const snackbarStore = useSnackbarStore();

// États
const ticketDialog = ref(false);
const deleteDialog = ref(false);
const showFilters = ref(false);
const selectedTicket = ref(null);
const ticketToDelete = ref(null);
const deleting = ref(false);

const filters = ref({
  type: null,
  status: 'all',
  search: ''
});

const ticketTypes = [
  { title: 'Demande d\'assistance', value: 'assistance' },
  { title: 'Signaler un bug', value: 'review' },
  { title: 'Autre', value: 'other' }
];

// Computed
const filteredTickets = computed(() => {
  let tickets = ticketStore.sortedTickets;

  if (filters.value.type) {
    tickets = tickets.filter(ticket => ticket.type === filters.value.type);
  }

  if (filters.value.status !== 'all') {
    const isUnread = filters.value.status === 'unread';
    tickets = tickets.filter(ticket => ticket.isRead !== isUnread);
  }

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    tickets = tickets.filter(ticket => 
      ticket.title.toLowerCase().includes(search) ||
      ticket.content.toLowerCase().includes(search) ||
      ticket.senderEmail.toLowerCase().includes(search)
    );
  }

  return tickets;
});

// Méthodes
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
      return 'onBackground' ;
    case 'review':
      return 'onBackground' ;
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

const openTicketDetails = (ticket) => {
  selectedTicket.value = ticket;
  ticketDialog.value = true;
  if (!ticket.isRead) {
    markAsRead(ticket._id);
  }
};

const markAsRead = async (ticketId) => {
  try {
    await ticketStore.markAsRead(ticketId);

  } catch (error) {
    snackbarStore.showNotification('Erreur lors du marquage du ticket', 'error', 'mdi-alert-circle');
  }
};

const confirmDelete = (ticket) => {
  ticketToDelete.value = ticket;
  deleteDialog.value = true;
  ticketDialog.value = false;
};

const confirmDeleteAction = async () => {
  if (!ticketToDelete.value) return;
  
  deleting.value = true;
  try {
    await ticketStore.deleteTicket(ticketToDelete.value._id);
    snackbarStore.showNotification('Ticket supprimé', 'onPrimary', 'mdi-delete');
    deleteDialog.value = false;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la suppression du ticket', 'error', 'mdi-alert-circle');
  } finally {
    deleting.value = false;
    ticketToDelete.value = null;
  }
};

// Lifecycle
onMounted(async () => {
  if (!authStore.userData.isAdmin) {
    router.push('/dashboard');
    return;
  }
  try {
    await ticketStore.fetchTickets();
  } catch (error) {
    snackbarStore.showNotification('Erreur lors du chargement des tickets', 'error', 'mdi-alert-circle');
  }
});
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
  transform: translateY(0px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.unread {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.ticket-content {
  background-color: rgba(var(--v-theme-surface-variant), 0.1);
  white-space: pre-wrap;
  line-height: 1.6;
}

.gap-2 {
  gap: 8px;
}
</style> 