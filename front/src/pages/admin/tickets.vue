<template>
  <v-container>
    <MainTitle title="Tickets" :subtitle="`${ticketStore.unreadCount} ticket(s) non lu(s)`" >
      <template v-slot:actions>
        <div class="d-flex ga-2 align-center ">
          <div class="d-flex align-center ga-2 btn-group">
          <v-btn
              value="active"
              size="small"
              color="surfaceContainer"
              :class="activeView === 'active' ? 'btn-active' : ''"
              variant="flat"
              rounded="lg"
              @click="activeView = 'active'"
            >
              Actifs
            </v-btn>
            <v-btn
              value="archived"
              size="small"
              :class="activeView === 'archived' ? 'btn-active' : ''"
              variant="flat"
              color="surfaceContainer"
              rounded="lg"
              @click="activeView = 'archived'"
            >
              Archivés
            </v-btn>
       
          </div>
          
          <v-btn
            prepend-icon="mdi-filter-variant"
            color="onBackground"
            @click="showFilters = !showFilters"
            rounded="lg"
            flat
            size="small"
            height="32"
          > 
            Filtres
          </v-btn>
        </div>
      </template>
    </MainTitle>

    <v-row>
      <v-col cols="12">
        <v-card class="py-6 pa-0" rounded="xl" color="transparent" flat>
         

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

          <!-- Router view pour les sous-pages avec transition -->
          <router-view v-slot="{ Component, route }">
            <transition :name="route.meta.transition || 'fade'" mode="out-in">
   
              <component :is="Component" :filters="filters"
              :loading="ticketStore.loading"
              @open-ticket="openTicketDetails"
              :key="route.path"
            />
          </transition>
        </router-view>
        </v-card>
      </v-col>
    </v-row>

    <!-- Dialog de détails du ticket -->
    <TicketDetails
      v-model="ticketDialog"
      :ticketId="selectedTicket?._id"
      @close="ticketDialog = false"
      @delete-ticket="confirmDelete"
      @archive-ticket="handleArchive"
      @restore-ticket="handleRestore"
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

<route lang="yaml">
meta:
  test: true
</route>

<script setup>



import { ref, computed, onMounted, watch } from 'vue';
import { useTicketStore } from '@/stores/ticketStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter, useRoute } from 'vue-router';
import { useSnackbarStore } from '@/stores/snackbarStore';



definePage({
  meta: {
    requiresAuth: true,
  }
})




const ticketStore = useTicketStore();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const snackbarStore = useSnackbarStore();

// États
const ticketDialog = ref(false);
const deleteDialog = ref(false);
const showFilters = ref(false);
const selectedTicket = ref(null);
const ticketToDelete = ref(null);
const deleting = ref(false);
const activeView = ref('active');

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

const handleArchive = async (ticket) => {
  try {
    await ticketStore.archiveTicket(ticket._id);
    snackbarStore.showNotification('Ticket archivé', 'success', 'mdi-archive');
    ticketDialog.value = false;
  } catch (error) {
    snackbarStore.showNotification(error.message || 'Erreur lors de l\'archivage du ticket', 'error', 'mdi-alert-circle');
  }
};

const handleRestore = async (ticket) => {
  try {
    await ticketStore.restoreTicket(ticket._id);
    snackbarStore.showNotification('Ticket restauré', 'success', 'mdi-archive-arrow-up');
    ticketDialog.value = false;
  } catch (error) {
    snackbarStore.showNotification(error.message || 'Erreur lors de la restauration du ticket', 'error', 'mdi-alert-circle');
  }
};

// Navigation selon la vue active
watch(activeView, (newView) => {
  const targetPath = newView === 'archived' ? '/admin/tickets/archived' : '/admin/tickets';
  if (route.path !== targetPath) {
    router.push(targetPath);
  }
});

// Lifecycle
onMounted(async () => {
  if (!authStore.userData.isAdmin) {
    router.push('/dashboard');
    return;
  }
  
  // Définir la vue active selon la route
  if (route.path === '/admin/tickets/archived') {
    activeView.value = 'archived';
  }
  
  try {
    await ticketStore.fetchTickets();
  } catch (error) {
    snackbarStore.showNotification('Erreur lors du chargement des tickets', 'error', 'mdi-alert-circle');
  }
});
</script>

<style scoped>
.btn-group {
  gap: 8px;
  padding: 4px;
  border-radius: 12px;
  background-color: rgba(var(--v-theme-surfaceContainer), .5);
}

.btn-active {
  background-color: rgba(var(--v-theme-surfaceContainerHighest), 1) !important;
  box-sizing: border-box;
  
}



/* Transition pour le router-view */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
