<template>
  <v-container class="fill-height ">
    <v-row justify="center" align="center">
      <v-col cols="12"  class="text-center">
        <v-card flat class="pa-6" color="transparent">
          <v-progress-circular
            indeterminate
            color="remplacement"
            size="64"
            width="6"
            class="mb-4"
          ></v-progress-circular>
          
          <h2 class="text-h5 mb-2">Chargement en cours</h2>
          <p class="text-body-1 text-medium-emphasis mb-4">
            Veuillez patienter pendant le chargement de vos données...
          </p>

          <span class="text-caption text-medium-emphasis mb-4">{{ initializationStore.currentlyLoading }}</span>

          <!-- <v-list bg-color="transparent" class="mb-4 d-flex flex-column gap-0 justify-start align-center">
            <v-list-item v-for="(item, index) in loadingItems" :key="index" class="justify-start d-flex align-center">
              <template v-slot:prepend>
                <v-icon
                  :color="item.loaded ? 'remplacement' : 'primary'"
                  :icon="item.loaded ? 'mdi-check-circle' : 'mdi-loading'"
                  class="mr-2"
                ></v-icon>
              </template>
              <v-list-item-title class="text-caption">{{ item.label }}</v-list-item-title>
            </v-list-item>
          </v-list> -->
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useInitializationStore } from '@/stores/initializationStore';

const loadingItems = ref([
  { key: 'substitutions', label: 'Chargement des substitutions', loaded: computed(() => initializationStore.initializationState.substitutions) },
  { key: 'center', label: 'Chargement des centres', loaded: computed(() => initializationStore.initializationState.center) },
  { key: 'team', label: 'Chargement des équipes', loaded: computed(() => initializationStore.initializationState.team) },
  { key: 'rotations', label: 'Chargement des rotations', loaded: computed(() => initializationStore.initializationState.rotations) },
  { key: 'personal', label: 'Chargement des données personnelles', loaded: computed(() => initializationStore.initializationState.personal) }
]);

const initializationStore = useInitializationStore();
</script>

<style scoped>
.v-progress-circular {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style> 