<template>
  <v-container class="mb-16">
    <MainTitle title="Demandes du centre" subtitle="Consulter et gérer toutes les demandes du centre">
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

    <v-row>
      <v-col cols="12" v-if="isLoading">
        <Loading />
      </v-col>
      <v-col v-else v-for="demand in sortedDemands" :key="demand._id" cols="12" >
        <AdminDemandCard :demand="demand" />
      </v-col>
      <v-col v-if="!isLoading && demands.length === 0" cols="12">
        <v-card class="pa-8 text-center" rounded="xl" elevation="0">
          <v-icon icon="mdi-information-outline" size="48" color="onSurface" opacity="0.3"></v-icon>
          <p class="text-h6 mt-4 mb-0">Aucune demande trouvée</p>
          <p class="text-body-2 opacity-70">Il n'y a actuellement aucune demande dans ce centre</p>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCenterStore } from '@/stores/centerStore.js';
import { useAuthStore } from '@/stores/authStore.js';
import { useSnackbarStore } from '@/stores/snackbarStore.js';

import { substitutionService } from '@/services/substitutionService.js';

defineOptions({
  name: 'admin-demands',
  meta: {
    requiresAuth: true,
    requiresAdmin: true,
    layout: 'default'
  }
});

const centerStore = useCenterStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

const demands = ref([]);
const isLoading = ref(false);
const selectedCenterId = ref(null);
const centers = computed(() => centerStore.centers);

const sortedDemands = computed(() => {
  return [...demands.value].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA; // Plus récent en premier
  });
});

const handleCenterChange = async (centerId) => {
  if (centerId) {
    await fetchCenterDemands(centerId);
  }
};

const fetchCenterDemands = async (centerId) => {
  isLoading.value = true;
  try {
    const response = await substitutionService.fetchAllCenterDemands(centerId);
    demands.value = response;
    
    snackbarStore.showNotification('Demandes chargées avec succès', 'onPrimary', 'mdi-check');
  } catch (error) {
    console.error('Erreur lors du chargement des demandes:', error);
    snackbarStore.showNotification('Erreur lors du chargement des demandes', 'onError', 'mdi-alert-circle-outline');
    demands.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    await centerStore.fetchCenters();
    
    // Charger les demandes en fonction du type d'admin
    if (authStore.userData.adminType === 'master') {
      selectedCenterId.value = null;
    } else {
      await fetchCenterDemands(authStore.userData.centerId);
      selectedCenterId.value = authStore.userData.centerId;
    }
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la récupération des centres', 'onError', 'mdi-alert-circle-outline');
  }
});
</script>

<style scoped>
</style>

