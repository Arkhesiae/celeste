<template>
  <v-container>
    <MainTitle title="Nouvelles inscriptions" subtitle="Gérer les nouvelles inscriptions">
      <template #actions>
        <v-select v-if="authStore.userData.adminType === 'master'" v-model="selectedCenterId" :items="centers"
          :item-props="center => ({
            title: center.name,
            subtitle: center.oaci
          })" item-value="_id" label="Sélectionner un centre" variant="solo-filled" rounded="xl" flat min-width="200px"
          max-width="300px" @update:model-value="handleCenterChange" />
      </template>
    </MainTitle>

    <v-row>
      <v-col v-for="user in pendingUsers" :key="user._id" cols="12">
        <v-card class="pa-2" rounded="xl" variant="flat" color="surface">
          <v-card-item>
            <v-card-title class="d-flex justify-space-between align-center">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal" size="40" class="mr-2">
                  {{ user.name.charAt(0) }}{{ user.lastName.charAt(0) }}
                </v-avatar>
                <div class="d-flex flex-column">
                  <div style="line-height: 1.2;" class="text-subtitle-1">
                    {{ user.name }} {{ user.lastName.toUpperCase() }}
                  </div>
                  <div style="line-height: 1.2;" class="text-caption text-medium-emphasis">
                    {{ user.email }}
                  </div>
                </div>
              </div>
            </v-card-title>
          </v-card-item>
          <v-card-text class="pt-0">
            <div class="d-flex flex-column ga-2">
              <div>
                <span class="">{{ userCenter(user) }}</span>
              </div>
              <div>
                <span class="text-primary font-weight-bold">{{ userCurrentTeam(user) }}</span>
              </div>
            </div>
          </v-card-text>
          <v-card-actions class="pt-0 ga-4  d-flex flex-wrap justify-end">
            <v-spacer />
            <v-btn variant="text" @click="rejectUser(user)">
              Supprimer
            </v-btn>
            <v-btn color="primary" variant="tonal" rounded="lg" prepend-icon="mdi-check" @click="approveUser(user)">
              Approuver l'inscription
            </v-btn>

          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Confirmation Dialog -->
    <ConfirmationDialog v-model="confirmDialog" :title="'Confirmation d\'action'" :text="confirmMessage"
      @confirm="handleConfirmAction" @cancel="confirmDialog = false" />
  </v-container>
</template>

<script setup>

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

const centers = ref([]);
const teams = ref([]);
const confirmDialog = ref(false);
const confirmMessage = ref('');
const confirmAction = ref('');
const selectedUser = ref(null);
const selectedCenterId = ref(null);

const pendingUsers = computed(() => {
  let users = userStore.users.filter(user => user.registrationStatus === 'pending');

  // Si c'est un admin local, ne montrer que les utilisateurs de son centre
  if (authStore.userData.adminType !== 'master') {
    users = users.filter(user => user.centerId === authStore.userData.centerId);
  }
  // Si un centre est sélectionné, filtrer par ce centre
  else if (selectedCenterId.value) {
    users = users.filter(user => user.centerId === selectedCenterId.value);
  }

  return users;
});



const userCurrentTeam = computed(() => (user) => {
  if (user.currentTeam) {
    const team = teams.value?.find(team => team._id === user.currentTeam.teamId);
    return team ? "Équipe " + team.name : 'Équipe inconnue';
  } else {
    return 'Aucune équipe';
  }
});

const userCenter = computed(() => (user) => {
  if (user.centerId) {
    const center = centers.value?.find(center => center._id === user.centerId);
    return center ? center.name : 'Centre inconnu';
  } else {
    return 'Aucun centre';
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
    if (authStore.userData.adminType === 'master') {
      await userStore.fetchUsers();
      selectedCenterId.value = null;
      [centers.value, teams.value] = await Promise.all([
        centerStore.fetchCenters(),
        teamStore.fetchAllTeams()
      ]);
    } else {
      [centers.value, teams.value] = await Promise.all([
        centerStore.fetchCenters(),
        teamStore.fetchCenterTeams(authStore.userData.centerId)
      ]);
      await userStore.fetchUsersByCenter(authStore.userData.centerId);
      selectedCenterId.value = authStore.userData.centerId;
    }

    console.log(centers.value);
    console.log(teams.value);

    snackbarStore.showNotification('Données chargées', 'onPrimary', 'mdi-check');
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    snackbarStore.showNotification('Erreur lors du chargement des données', 'onError', 'mdi-alert-circle');
  }
});
</script>

<style scoped></style>