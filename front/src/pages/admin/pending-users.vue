<template>
  <v-container>
    <div class=" my-16 d-flex justify-space-between align-center">

      <div class="d-flex flex-column">
      <span class="text-h4 font-weight-medium">Nouvelles inscriptions</span>
      <span class="text-h4 text-overline text-medium-emphasis">gérer les nouvelles inscriptions</span>
    </div>
      <v-select
          v-if="authStore.adminType === 'master'"
          v-model="selectedCenterId"
          :items="centers"
          :item-props="center => ({
            title: center.name,
            subtitle: center.oaci
          })"
          item-value="_id"
          label="Sélectionner un centre"
          variant="solo-filled"
          rounded="xl"
          flat
          min-width="200px" 
          max-width="300px"
          @update:model-value="handleCenterChange"
        />
    </div>
    

    <v-row class="justify-space-between align-center mb-4">
      <v-col cols="12" md="6" >
      
      </v-col>
      
      <v-col cols="12" md="6" class="d-flex justify-end gap-2">
        <v-text-field
          v-model="searchQuery"
          label="Rechercher"
          variant="solo"
          flat
          rounded="xl"
          single-line
          hide-details
          density="compact"
          class="search-field"
          style="max-width: 300px"
          clearable
        />
        <v-menu color="onBackground" rounded="lg">
          <template v-slot:activator="{ props }">
            <v-btn color="primary" variant="text" rounded="lg" v-bind="props">
              <span class="text-overline">{{ sortBy ? sortBy : 'Trier par'}}</span>
              <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
            <v-list-item rounded="lg" @click="sortBy = 'name'">
              <v-list-item-title>Prénom</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="sortBy = 'lastName'">
              <v-list-item-title>Nom</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="sortBy = 'email'">
              <v-list-item-title>Email</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="sortBy = 'status'">
              <v-list-item-title>Statut</v-list-item-title>
            </v-list-item>
            <v-list-item rounded="lg" @click="sortBy = 'createdAt'">
              <v-list-item-title>Date d'inscription</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <v-row>
      <v-col v-for="user in pendingUsers" :key="user._id" cols="12" >
        <v-card class="pa-2" rounded="xl" variant="flat" color="surface">
          <v-card-item>
            <v-card-title class="d-flex justify-space-between align-center">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal" size="40" class="mr-2">
                  {{ user.name.charAt(0) }}{{ user.lastName.charAt(0) }}
                </v-avatar>
                <div>
                  <div class="text-subtitle-1">{{ user.name }} {{ user.lastName.toUpperCase() }}</div>
                  <div class="text-caption text-medium-emphasis">{{ user.email }}</div>
                </div>
              </div>
            </v-card-title>
           
          </v-card-item>
          <v-card-text class="pt-0">
            <v-list>
          
              <v-list-item>
                
                <v-list-item-title>Equipe</v-list-item-title>
                <v-list-item-subtitle>{{ userCurrentTeam(user)}}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions class="pt-0 flex-wrap justify-end">
            <v-spacer></v-spacer>
            <v-btn
              color="success"
              variant="tonal"
              rounded="lg"
              prepend-icon="mdi-check"
              @click="approveUser(user)"
            >
              Approuver l'inscription
            </v-btn>
            <v-btn
              color="error"
              variant="text"


              @click="rejectUser(user)"
            
            >
              Rejeter
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Dialog -->
    <v-dialog v-model="confirmDialog" max-width="400">
      <v-card rounded="xl" variant="flat" class="pa-6">
        <v-card-title class="text-h6 pa-0">Confirmer l'action</v-card-title>
        <v-card-text class="pa-0 py-4">
          {{ confirmMessage }}
        </v-card-text>
        <v-card-actions class="pa-0 ">
          <v-spacer></v-spacer>
          <v-btn color="onSurface" variant="text" @click="confirmDialog = false">
            Annuler
          </v-btn>
          <v-btn
            :color="confirmAction === 'approve' ? 'success' : 'error'"
            variant="tonal"
            @click="handleConfirmAction"
          >
            Confirmer
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from "@/stores/userStore";
import { useSnackbarStore } from "@/stores/snackbarStore";
import { useAuthStore } from '@/stores/authStore';
import { useTeamStore } from '@/stores/teamStore';
import { useCenterStore } from '@/stores/centerStore';

const userStore = useUserStore();
const snackbarStore = useSnackbarStore();
const authStore = useAuthStore();
const teamStore = useTeamStore();
const centerStore = useCenterStore();

const confirmDialog = ref(false);
const confirmMessage = ref('');
const confirmAction = ref('');
const selectedUser = ref(null);
const selectedCenterId = ref(null);

const centers = computed(() => centerStore.centers);

const pendingUsers = computed(() => {
  let users = userStore.users.filter(user => user.registrationStatus === 'pending');
  
  // Si c'est un admin local, ne montrer que les utilisateurs de son centre
  if (authStore.adminType !== 'master') {
    users = users.filter(user => user.centerId === authStore.centerId);
  }
  // Si un centre est sélectionné, filtrer par ce centre
  else if (selectedCenterId.value) {
    users = users.filter(user => user.centerId === selectedCenterId.value);
  }
  
  return users;
});

const centerTeams = computed(() => {
  return teamStore.centerTeams;
}); 

const userCurrentTeam = computed(() => (user) => {
  if (user.currentTeam) {
    const team = centerTeams.value.find(team => team._id === user.currentTeam?._id);
    return team ? team.name : 'Équipe inconnue';
  } else {
    return 'Aucune équipe';
  }
});

const approveUser = (user) => {
  selectedUser.value = user;
  confirmAction.value = 'approve';
  confirmMessage.value = `Êtes-vous sûr de vouloir approuver la candidature de ${user.name} ${user.lastName} ?`;
  confirmDialog.value = true;
};

const rejectUser = (user) => {
  selectedUser.value = user;
  confirmAction.value = 'reject';
  confirmMessage.value = `Êtes-vous sûr de vouloir rejeter la candidature de ${user.name} ${user.lastName} ?`;
  confirmDialog.value = true;
};

const handleConfirmAction = async () => {
  if (!selectedUser.value) return;

  try {
    if (confirmAction.value === 'approve') {
      await userStore.approvePendingUser(selectedUser.value._id);
      snackbarStore.showNotification('Inscription approuvée', 'onSuccess', 'mdi-check-circle');
    } else {
      await userStore.deletePendingUser(selectedUser.value._id);
      snackbarStore.showNotification('Inscription rejetée', 'onSuccess', 'mdi-check-circle');
    }
  } catch (error) {
    console.error('Erreur lors de l\'action:', error);
    snackbarStore.showNotification(
      "Erreur lors " + (confirmAction.value === 'approve' ? "de l'approbation" : "du rejet"),
      'onError',
      'mdi-alert-circle'
    );
  } finally {
    confirmDialog.value = false;
    selectedUser.value = null;
  }
};

const handleCenterChange = async (centerId) => {
  try {
    if (centerId) {
      await userStore.fetchUsersByCenter(centerId);
    } else {
      await userStore.fetchUsers();
    }
    snackbarStore.showNotification('Utilisateurs chargés', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
    snackbarStore.showNotification('Erreur lors du chargement des utilisateurs', 'onError', 'mdi-alert-circle');
  }
};

onMounted(async () => {
  try {
    await Promise.all([
      centerStore.fetchCenters(),
      teamStore.fetchCenterTeams(authStore.centerId)
    ]);

    // Charger les utilisateurs en fonction du type d'admin
    if (authStore.adminType === 'master') {
      await userStore.fetchUsers();
      selectedCenterId.value = null;
    } else {
      await userStore.fetchUsersByCenter(authStore.centerId);
      selectedCenterId.value = authStore.centerId;
    }

    snackbarStore.showNotification('Données chargées', 'onPrimary', 'mdi-check');
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    snackbarStore.showNotification('Erreur lors du chargement des données', 'onError', 'mdi-alert-circle');
  }
});
</script>

<style scoped>

</style> 