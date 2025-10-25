<template>
  <v-container>
    <MainTitle title="Liste des utilisateurs" subtitle="Gérer et organiser les membres">

      <template #actions> 
        <v-select
          v-if="authStore.userData.adminType === 'master'"
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
      </template>

    </MainTitle>


    <div class="list-header-container"> 
    <ListHeader
      :filters="[
        { label: 'Tous', value: 'all' },
        { label: 'Administrateurs', value: 'admin', color: 'tertiary' },
        { label: 'Utilisateurs', value: 'user' }
      ]"
      :sort-options="sortOptions"
      v-model:filter="selectedFilter"
      v-model:search="searchQuery"
      v-model:sort="sortBy"
    />
    </div>

    <v-row>
      <v-col v-for="user in sortedAndFilteredUsers" :key="user._id" cols="12" md="6" lg="4" :class="smAndDown ? 'pa-0' : ''">
        <UserCard 
          :user="user" 
          @click="openUserDialog(user._id)"
          @approve="approveUser"
          @makeAdmin="makeAdmin"
          @removeAdmin="removeAdmin"
          @assignCenter="openCenterDialog"
          @delete="deleteUser"
        />
      </v-col>
    </v-row>

    <!-- User Details Dialog -->
    <UserCardDetails
      :userId="selectedUser"
      :dialogVisible="userDialog"
      @update:dialogVisible="userDialog = $event"
      @makeAdmin="makeAdmin"
      @removeAdmin="removeAdmin"
      @assignCenter="openCenterDialog"
      @delete="deleteUser"
    />
  <!-- 
    Center Assignment Dialog -->
    <AssignCenterDialog
      :dialogVisible="centerDialog"
      :userId="selectedUser"
      @update:dialogVisible="centerDialog = $event"
      @centerAssigned="assignCenter"
    />
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
import ListHeader from '@/components/common/ListHeader.vue';
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

const isMasterAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'master');
const isLocalAdmin = computed(() => authStore.userData.isAdmin && authStore.userData.adminType === 'local');
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
  try {
    if (authStore.userData.adminType === 'master') {
      await userStore.fetchUsers();
      selectedCenterId.value = null;
    } else {
      await userStore.fetchUsersByCenter(authStore.userData.centerId);
      await teamStore.fetchCenterTeams(authStore.userData.centerId);
      selectedCenterId.value = authStore.userData.centerId;
    }
    snackbarStore.showNotification('Données chargées', 'onPrimary', 'mdi-check');
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
