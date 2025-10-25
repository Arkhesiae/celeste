<template>
  <v-container>

    <MainTitle title="Tickets" :subtitle="`${ticketStore.unreadCount} ticket(s) non lu(s)`" >
      <template v-slot:actions>
        <div class="d-flex ga-2 align-center">
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
                <v-col cols="12" sm="4" class="py-0">
                  <v-select
                    v-model="filters.type"
                    :items="ticketTypes"
                    label="Type de ticket"
                    clearable
                    variant="solo-filled"
                    flat
                    height="32"
                    rounded="xl"
                    density="comfortable"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="4" class="py-0">
                  <v-select
                    v-model="filters.status"
                    :items="[
                      { title: 'Tous', value: 'all' },
                      { title: 'En cours', value: 'in_progress' },
                      { title: 'Traité', value: 'done' },
                      { title: 'Fermé', value: 'closed' }
                    ]"
                    label="Statut"
                    variant="solo-filled"
                    flat
                    rounded="xl"
                    density="comfortable"
                  ></v-select>
                </v-col>
                <v-col cols="12" sm="4" class="py-0">
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
          <TicketList
            :tickets="filteredTickets"
            :loading="ticketStore.loading"
            @open-ticket="openTicketDetails"
          />
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog de détails du ticket -->
    <TicketDetails
      v-model="ticketDialog"
      :ticketId="selectedTicket?._id"
      @close="ticketDialog = false"
      @delete-ticket="confirmDelete"
     
    />

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
import TicketList from '@/components/Tickets/TicketList.vue';
import TicketDetails from '@/components/Tickets/TicketDetails.vue';

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
    tickets = tickets.filter(ticket => ticket.status === filters.value.status);
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
.gap-2 {
  gap: 8px;
}
</style> 