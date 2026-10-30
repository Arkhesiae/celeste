<template>
  <v-container>
    <MainTitle title="Liste des utilisateurs" subtitle="Gérer et organiser les membres">
      <template #actions>
        <v-select
v-if="authStore.userData.adminType === 'master'" v-model="selectedCenterId" :items="centers"
          :item-props="center => ({
            title: center.name,
            subtitle: center.oaci
          })" item-value="_id" label="Sélectionner un centre" variant="solo-filled" rounded="xl" class="" flat
          min-width="200px" max-width="300px" clearable @update:model-value="handleCenterChange" />
      </template>
    </MainTitle>

    <v-row class="justify-space-between align-center mb-4">
      <v-col cols="12" md="6">
        <v-chip-group v-model="selectedFilter" column variant="flat" color="onBackground">
          <v-chip variant="text" rounded="lg" value="all">
            Tous
          </v-chip>
          <v-chip variant="text" color="tertiary" rounded="lg" value="admin">
            Administrateurs
          </v-chip>
          <v-chip variant="text" rounded="lg" value="user">
            Utilisateurs
          </v-chip>
          <v-chip variant="text" rounded="lg" value="pending">
            En attente
          </v-chip>
        </v-chip-group>
      </v-col>

      <v-col cols="12" md="6" class="d-flex justify-end">
        <v-text-field
          v-model="searchQuery"
          label="Rechercher un utilisateur"
          prepend-inner-icon="mdi-magnify"
          variant="solo"
          flat
          rounded="xl"
          single-line
          hide-details
          density="compact"
          class="search-field"
          style="max-width: 360px; width: 100%"
          clearable
        />
      </v-col>
    </v-row>

    <v-row>
      <div v-if="isLoading || !showUserList">
        <Loading />
      </div>
      <v-col
        v-else-if="!sortedAndFilteredUsers.length"
        cols="12"
        class="text-medium-emphasis"
      >
        Aucun utilisateur trouvé
      </v-col>
      <v-col
v-for="user in sortedAndFilteredUsers" v-else :key="user._id" cols="12" md="6" lg="4"
        :class="smAndDown ? 'pa-0' : ''">
        <UserCard
:user="user" @click="openUserDialog(user._id)" @approve="approveUser" @make-admin="makeAdmin"
          @remove-admin="removeAdmin" @assign-center="openCenterDialog" @delete="deleteUser" />
      </v-col>
    </v-row>


    <!-- User Details Dialog -->
    <UserCardDetails
:user-id="selectedUser" :dialog-visible="userDialog" @update:dialog-visible="userDialog = $event"
      @make-admin="makeAdmin" @remove-admin="removeAdmin" @assign-center="openCenterDialog" @delete="deleteUser" />
    <!-- 
    Center Assignment Dialog -->
    <AssignCenterDialog
:dialog-visible="centerDialog" :user-id="selectedUser"
      @update:dialog-visible="centerDialog = $event" @center-assigned="assignCenter" />
  </v-container>
</template>

<script setup>

import { useCenterStore } from "@/stores/centerStore";
import { useUserStore } from "@/stores/userStore";
import { useSnackbarStore } from "@/stores/snackbarStore";
import { useTeamStore } from '@/stores/teamStore';
import { useAuthStore } from '@/stores/authStore';
import { useDisplay } from 'vuetify';
// import ListHeader from '@/components/common/ListHeader.vue';
import UserCard from '@/components/Users/UserCard.vue';
import UserCardDetails from '@/components/Users/UserCardDetails.vue';
import AssignCenterDialog from '@/components/Users/AssignCenterDialog.vue';

const centerStore = useCenterStore();
const teamStore = useTeamStore();
const authStore = useAuthStore();
const userStore = useUserStore();
const snackbarStore = useSnackbarStore();
const { smAndDown } = useDisplay();

const centerDialog = ref(false);
const selectedFilter = ref('all');
const selectedUser = ref('');
const sortBy = ref('');
const sortDirection = ref('asc');
const searchQuery = ref('');
const selectedCenterId = ref(null);
const userDialog = ref(false);
const showUserList = ref(false);
const isLoading = ref(false);

// import { defineAsyncComponent } from 'vue'

// const AsyncUserCard = defineAsyncComponent({
//   loader: () => import('@/components/Users/UserCard.vue'),
//   loadingComponent: () => import('@/components/common/Loaders/Loading.vue'),
//   delay: 0,

// })

// const isMasterAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'master');
// const isLocalAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'local');
const centers = computed(() => centerStore.centers);
const users = computed(() => userStore.users);
// const sortOptions = [
//   { text: 'Prénom', sortValue: 'name' },
//   { text: 'Nom', sortValue: 'lastName' },
//   { text: 'Email', sortValue: 'email' },
//   { text: 'Statut', sortValue: 'status' },
//   { text: 'Date d\'inscription', sortValue: 'createdAt' },
// ];

const filteredUsers = computed(() => {
  let filtered = users.value;
  if (!users.value) return [];

  // Filtrer par type d'admin
  if (authStore.userData.adminType !== 'master') {
    filtered = filtered.filter(user => user.centerId === authStore.userData.centerId);
  }

  if (selectedFilter.value === 'admin') {
    filtered = filtered.filter((user) => user.isAdmin);
  } else if (selectedFilter.value === 'pending') {
    filtered = filtered.filter((user) => user.status === 'pending');
  } else if (selectedFilter.value === 'user') {
    filtered = filtered.filter((user) => !user.isAdmin);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase().trim();
    filtered = filtered.filter((user) => {
      const center = getCenterById(user.centerId);
      const haystack = [
        user.name,
        user.lastName,
        user.email,
        center?.name,
        center?.OACI || center?.oaci,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }

  return filtered;
});

const sortedAndFilteredUsers = computed(() => {
  const sortKey = sortBy.value?.sortValue;
  if (!sortKey) return filteredUsers.value;

  return [...filteredUsers.value].sort((a, b) => {
    let comparison = 0;

    if (sortKey === 'createdAt') {
      comparison = new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
    } else {
      comparison = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), 'fr');
    }

    return sortDirection.value === 'asc' ? comparison : -comparison;
  });
});

const getCenterById = (centerId) => {
  return centers.value.find(center => center._id === centerId) || null;
};

const openCenterDialog = (userId) => {
  console.log(userId)
  selectedUser.value = userId;
  centerDialog.value = true;
};

const assignCenter = async ({ userId, centerId }) => {
  try {
    await userStore.assignCenter(userId, centerId);
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

const approveUser = async (user) => {
  try {
    await userStore.approveUser(user._id);
    snackbarStore.showNotification('Utilisateur approuvé', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error approving user:', error);
    snackbarStore.showNotification('Erreur lors de l\'approbation', 'onError', 'mdi-alert-circle');
  }
};

const openUserDialog = (userId) => {
  console.log(userId)
  selectedUser.value = userId;
  userDialog.value = true;
};

const handleCenterChange = async (centerId) => {
  try {
    if (centerId) {
      await teamStore.fetchCenterTeams(centerId);
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
  isLoading.value = true;
  try {
    if (authStore.userData.adminType === 'master') {
      await userStore.fetchUsers();
      selectedCenterId.value = null;
    } else {
      console.log(authStore.userData.centerId);
      await userStore.fetchUsersByCenter(authStore.userData.centerId);
      selectedCenterId.value = authStore.userData.centerId;
    }
    snackbarStore.showNotification('Données chargées', 'onPrimary', 'mdi-check');
    isLoading.value = false;
    setTimeout(() => {
      showUserList.value = true;
    }, 500);
  } catch (error) {
    console.error('Error fetching initial data:', error);
    snackbarStore.showNotification('Erreur lors du chargement des données : ' + error.message, 'onError', 'mdi-alert-circle');
  }
});
</script>

<style scoped>
.sort-select {
  max-width: 200px;
}
</style>
