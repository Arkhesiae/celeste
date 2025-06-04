<template>
  <v-container>
    <div class=" my-16 d-flex justify-space-between align-start flex-wrap">
      <div class="d-flex flex-column">
      <span class="text-h4 font-weight-medium">Liste des utilisateurs</span>
      <span class="text-h4 text-overline text-medium-emphasis">gérer et organiser les membres</span>
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
          class=""
          flat
          min-width="200px" 
          max-width="300px"
          @update:model-value="handleCenterChange"
        />
    </div>
 

    <v-row class="justify-space-between align-center mb-4">
      <v-col cols="12" md="6" >
        <v-chip-group v-model="selectedFilter" column variant="flat" color="onBackground"  >
          <v-chip variant="text" rounded="lg" value="all">Tous</v-chip>
          <v-chip variant="text" color="tertiary" rounded="lg" value="admin">Administrateurs</v-chip>
          <v-chip variant="text" rounded="lg" value="user">Utilisateurs</v-chip>
        </v-chip-group>
       
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
              <span class="text-overline">{{ sortBy ? sortBy.text : 'Trier par'}}</span>
              <v-icon>mdi-chevron-down</v-icon>
            </v-btn>
          </template>
          <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
            <v-list-item v-for="option in sortOptions" :key="option.value" rounded="lg" @click="sortBy = option">
              <v-list-item-title>{{ option.text }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-col>
    </v-row>

    <v-row>
      <v-col v-for="user in sortedAndFilteredUsers" :key="user._id" cols="12" md="6" lg="4" :class="smAndDown ? 'pa-0' : ''">
        <v-card class="px-2 ma-0" :rounded="smAndDown ? 'lg' : 'xl'" variant="flat" @click="openUserDialog(user)" :color="smAndDown ? 'transparent ' : 'surface'">
          <v-card-item>
            <v-card-title class="d-flex justify-space-between align-center">
              <div class="d-flex align-center">
                <v-avatar color="primary" variant="tonal"  size="40" class="mr-2">
                  {{ user.name.charAt(0) }}{{ user.lastName.charAt(0) }}
                </v-avatar>
                <div>
                  <div class="text-subtitle-1">{{ user.name }} {{ user.lastName.toUpperCase() }}</div>
                  <div class="text-caption text-medium-emphasis">{{ user.email }}</div>
                </div>
              </div>
              <v-menu  color="onBackground" rounded="lg">
                <template v-slot:activator="{ props }">
                  <v-btn icon variant="text" v-bind="props" @click.stop>
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </template>
                <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
                  <v-list-item rounded="lg" @click.stop="approveUser(user)" v-if="user.registrationStatus=== 'pending' && (isLocalAdmin || isMasterAdmin)">
                    <v-list-item-title>Approuver</v-list-item-title>
                  </v-list-item>
                  <v-list-item rounded="lg" @click.stop="makeAdmin(user)" v-if="!user.isAdmin && isMasterAdmin">
                    <v-list-item-title>Octroyer statut admin</v-list-item-title>
                  </v-list-item>
                  <v-list-item rounded="lg" @click.stop="removeAdmin(user)" v-if="user.isAdmin && isMasterAdmin">
                    <v-list-item-title>Enlever statut admin</v-list-item-title>
                  </v-list-item>
                  <v-list-item rounded="lg" @click.stop="openCenterDialog(user)" v-if="isMasterAdmin">
                    <v-list-item-title>Modifier le centre</v-list-item-title>
                  </v-list-item>
                  <v-list-item rounded="lg" @click.stop="deleteUser(user)" v-if="isLocalAdmin || isMasterAdmin">
                    <v-list-item-title class="text-onError">Supprimer</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </v-card-title>
          </v-card-item>
          <v-card-text class="pt-0 d-flex justify-start">
            <div   v-if="user.isAdmin" class="d-flex mr-2"
             :class="user.adminType === 'master' ? 'block' : ''"
            >
              <v-chip
                rounded="lg"
                variant="flat"
              
                color="surface"
                size="small"
               
              > 
              <v-icon class="mr-2" v-if="user.isAdmin && user.adminType === 'master'" color="primary">mdi-star-four-points</v-icon>
              <v-icon class="mr-2" v-else color="secondary">mdi-shield-crown-outline</v-icon>
              Admin</v-chip>
            </div>
           
            <v-chip
              color="onBackground"
              rounded="lg"
              size="small"
              class="mr-2"
            >{{ getCenterById(user.centerId)?.name || "No center" }}</v-chip>

            <v-chip
              color="onBackground"
              rounded="lg"
              size="small"
              class="mr-2"
            >{{ user.currentTeam?.name || "No team" }}</v-chip>

            <v-chip
              v-if="user.status === 'pending'"
              :color="user.status === 'pending' ? 'warning' : 'success'"
              size="small"
            >{{ user.status === 'pending' ? 'En attente' : 'Approuvé' }}</v-chip>
          </v-card-text>
        </v-card>
        <v-divider v-if="smAndDown" opacity="0.05" class="ma-0 pa-0"></v-divider>
      </v-col>
    </v-row>

    <!-- User Details Dialog -->
    <v-dialog v-model="userDialog" max-width="600">
      <v-card v-if="selectedUser" rounded="xl" variant="flat" class="pa-6">
        <v-card-title class="d-flex justify-space-between align-center pa-0">
          <div class="d-flex align-center">
            <v-avatar color="primary" size="60" class="mr-3">
              {{ selectedUser.name.charAt(0) }}{{ selectedUser.lastName.charAt(0) }}
            </v-avatar>
            <div>
              <div class="text-h5">{{ selectedUser.name }} {{ selectedUser.lastName.toUpperCase() }}</div>
              <div class="text-subtitle-1 text-medium-emphasis">{{ selectedUser.email }}</div>
            </div>
          </div>
          <v-btn variant="text" icon @click="userDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-text class="pa-0 mt-6">
          <v-row>
            <v-col cols="12" md="6">
              <div class="text-subtitle-1 mb-2">Informations</div>
              <v-list>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>Statut</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                      rounded="lg"
                      color="onBackground"
                      :color="selectedUser.registrationStatus === 'pending' ? 'warning' : 'success'"
                      size="small"
                    >{{ selectedUser.registrationStatus === 'pending' ? 'Candidature en attente' : 'Candidature approuvée' }}</v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-office-building</v-icon>
                  </template>
                  <v-list-item-title>Centre</v-list-item-title>
                  <v-list-item-subtitle>
                    <v-chip
                      color="onBackground"
                      rounded="lg"
                      size="small"
                      class="mr-2"
                    >{{ getCenterById(selectedUser.centerId)?.name || "No center" }}</v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <template v-slot:prepend>
                    <v-icon>mdi-calendar</v-icon>
                  </template>
                  <v-list-item-title>Date d'inscription</v-list-item-title>
                  <v-list-item-subtitle>{{ new Date(selectedUser.createdAt).toLocaleDateString() }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <div class="text-subtitle-1 mb-2">Actions</div>
              <v-list>
                <v-list-item @click="approveUser(selectedUser)" v-if="selectedUser.registrationStatus === 'pending' && (isLocalAdmin || isMasterAdmin)">
                  <template v-slot:prepend>
                    <v-icon>mdi-check</v-icon>
                  </template>
                  <v-list-item-title>Approuver la candidature</v-list-item-title>
                </v-list-item>
                <v-list-item rounded="lg" @click="makeAdmin(selectedUser)" v-if="!selectedUser.isAdmin && isMasterAdmin">
                  <template v-slot:prepend>
                    <v-icon>mdi-shield-account</v-icon>
                  </template>
                  <v-list-item-title>Octroyer statut admin</v-list-item-title>
                </v-list-item>
                <v-list-item rounded="lg" @click="removeAdmin(selectedUser)" v-if="selectedUser.isAdmin && isMasterAdmin">
                  <template v-slot:prepend>
                    <v-icon>mdi-shield-account</v-icon>
                  </template>
                  <v-list-item-title>Enlever statut admin</v-list-item-title>
                </v-list-item>
                <v-list-item rounded="lg" @click="openCenterDialog(selectedUser)" v-if="isMasterAdmin">
                  <template v-slot:prepend>
                    <v-icon>mdi-office-building-marker</v-icon>
                  </template>
                  <v-list-item-title>Modifier le centre</v-list-item-title>
                </v-list-item>
                <v-list-item rounded="lg" color="error" @click="deleteUser(selectedUser)" v-if="isLocalAdmin || isMasterAdmin">
                  <template v-slot:prepend>
                    <v-icon>mdi-delete</v-icon>
                  </template>
                  <v-list-item-title>Supprimer l'utilisateur</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Center Assignment Dialog -->
    <v-dialog v-model="centerDialog" max-width="500">
      <v-card>
        <v-card-title>Assigner un centre</v-card-title>
        <v-card-text>
          <v-select
            v-model="selectedCenter"
            :items="centers"
            :reduce="center => center._id"
            item-title='name'
            item-value="_id"
            variant="outlined"
            label="Sélectionner un centre"
            dense
          />
        </v-card-text>
        <v-card-actions>
          <v-btn text color="red" @click="centerDialog = false">Annuler</v-btn>
          <v-btn text color="primary" @click="assignCenter">Assigner</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCenterStore } from "@/stores/centerStore";
import { useUserStore } from "@/stores/userStore";
import { useSnackbarStore } from "@/stores/snackbarStore";
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useDisplay } from 'vuetify';

const centerStore = useCenterStore();
const teamStore = useTeamStore();
const authStore = useAuthStore();
const userStore = useUserStore();
const snackbarStore = useSnackbarStore();
const { smAndDown } = useDisplay();

const centerDialog = ref(false);
const selectedFilter = ref('all');
const selectedCenter = ref(null);
const selectedUser = ref(null);
const sortBy = ref('');
const sortDirection = ref('asc');
const searchQuery = ref('');
const selectedCenterId = ref(null);
const isMasterAdmin = computed(() => authStore.isAdmin && authStore.adminType === 'master');
const isLocalAdmin = computed(() => authStore.isAdmin && authStore.adminType === 'local');
const centers = computed(() => centerStore.centers);
const users = computed(() => userStore.users);
const sortOptions = [
  { text: 'Prénom', sortValue: 'name' },
  { text: 'Nom', sortValue: 'lastName' },
  { text: 'Email', sortValue: 'email' },
  { text: 'Statut', sortValue: 'status' },
  { text: 'Date d\'inscription', sortValue: 'createdAt' },
];

const filteredUsers = computed(() => {
  let filtered = users.value;
  if (!users.value) return [];

  // Filtrer par type d'admin
  if (authStore.adminType !== 'master') {
    filtered = filtered.filter(user => user.centerId === authStore.centerId);
  }

  if (selectedFilter.value === 'admin') {
    filtered = filtered.filter((user) => user.isAdmin);
  } else if (selectedFilter.value === 'pending') {
    filtered = filtered.filter((user) => user.status === 'pending');
  } else if (selectedFilter.value === 'user') {
    filtered = filtered.filter((user) => !user.isAdmin);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter((user) => {
      const center = getCenterById(user.centerId);
      return (
        user.name.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (center && center.name.toLowerCase().includes(query))
      );
    });
  }

  return filtered;
});

const sortedAndFilteredUsers = computed(() => {
  return [...filteredUsers.value].sort((a, b) => {
    let comparison = 0;
    
    if (sortBy.value.sortValue === 'createdAt') {
      comparison = new Date(a[sortBy.value.sortValue]).getTime() - new Date(b[sortBy.value.sortValue]).getTime();
    } else {
      comparison = String(a[sortBy.value.sortValue]).localeCompare(String(b[sortBy.value.sortValue]));
    }
    
    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

const getCenterById = (centerId) => {
  return centers.value.find(center => center._id === centerId) || null;
};



const openCenterDialog = (user) => {
  selectedUser.value = user;
  selectedCenter.value = user.centerId;
  centerDialog.value = true;
};

const assignCenter = async () => {
  if (!selectedCenter.value || !selectedUser.value) return;

  try {
    await userStore.assignCenter(selectedUser.value._id, selectedCenter.value);
    centerDialog.value = false;
    snackbarStore.showNotification('Centre assigné', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error assigning center:', error);
    snackbarStore.showNotification('Erreur lors de l\'assignation du centre', 'onError', 'mdi-alert-circle');
  }
};

const deleteUser = async (user) => {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer ${user.name} ?`)) return;

  try {
    await userStore.deleteUser(user._id);
    snackbarStore.showNotification('Utilisateur supprimé', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error deleting user:', error);
    snackbarStore.showNotification('Erreur lors de la suppression', 'onError', 'mdi-alert-circle');
  }
};

const makeAdmin = async (user) => {
  try {
    await userStore.makeAdmin(user._id);
    snackbarStore.showNotification('Statut admin octroyé', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error making user admin:', error);
    snackbarStore.showNotification('Erreur lors de l\'octroi du statut admin', 'onError', 'mdi-alert-circle');
  }
};

const removeAdmin = async (user) => {
  try {
    await userStore.removeAdmin(user._id);
    snackbarStore.showNotification('Statut admin retiré', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error removing user admin:', error);
    snackbarStore.showNotification('Erreur lors de la suppression du statut admin ' + error.message, 'onError', 'mdi-alert-circle');
  }
};

const userDialog = ref(false);

const openUserDialog = (user) => {
  selectedUser.value = user;
  userDialog.value = true;
};

const handleCenterChange = async (centerId) => {
  try {
    if (centerId) {

      await userStore.fetchUsersByCenter(centerId);
    } else {
      await userStore.fetchUsers();
    }
    console.log(users.value)
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
    console.error('Error fetching initial data:', error);
    snackbarStore.showNotification('Erreur lors du chargement des données : ' + error.message, 'onError', 'mdi-alert-circle');
  }
});

</script>

<style scoped>
.block {
  position: relative;
  z-index: 0;
  overflow: visible !important;
  opacity: 1 !important;
}

.block:after, .block:before {
  content: '';
  position: absolute;
  left: -1.5px;
  top: -1.5px;
  border-radius: 10px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
  rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 3px);
  height: calc(100% + 3px);
  z-index: -1;
  animation: steam 7s linear infinite;
}

@keyframes steam {
  0% {
    background-position: 0 0;
  }
  80% {
    background-position: 400% 0;
  }
  100% {
    background-position: 400% 0;
  }
}

.block:after {
  filter: blur(5px);
}

.sort-select {
  max-width: 200px;
}

.search-field {
  max-width: 300px;
}

.gap-2 {
  gap: 8px;
}

.v-card {
  cursor: pointer;
  transition: transform 0.2s;
}


</style>
