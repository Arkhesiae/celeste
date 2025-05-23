<template>
  <v-container>
    <div class="my-16 d-flex flex-column">
      <span class="text-h4 font-weight-medium">Nouvelles inscriptions</span>
      <span class="text-h4 text-overline text-medium-emphasis">gérer les nouvelles inscriptions</span>
    </div>

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
              Approuver la candidature
            </v-btn>
            <v-btn
              color="error"
              variant="text"


              @click="rejectUser(user)"
            
            >
              Rejeter la candidature
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

const userStore = useUserStore();
const snackbarStore = useSnackbarStore();
const authStore = useAuthStore();
const teamStore = useTeamStore();

const confirmDialog = ref(false);
const confirmMessage = ref('');
const confirmAction = ref('');
const selectedUser = ref(null);

const pendingUsers = computed(() => {
  return userStore.users.filter(user => user.registrationStatus === 'pending');
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
      await userStore.approveUser(selectedUser.value._id);
      snackbarStore.showNotification('Candidature approuvée', 'onSuccess', 'mdi-check-circle');
    } else {
      await userStore.deleteUser(selectedUser.value._id);
      snackbarStore.showNotification('Candidature rejetée', 'onSuccess', 'mdi-check-circle');
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

onMounted(async () => {
  try {
    await teamStore.fetchCenterTeams(authStore.centerId);
    await userStore.fetchUsersOfCenter(authStore.centerId);
    snackbarStore.showNotification('Données chargées', 'onPrimary', 'mdi-check');
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error);
    snackbarStore.showNotification('Erreur lors du chargement des données', 'onError', 'mdi-alert-circle');
  }
});
</script>

<style scoped>

</style> 