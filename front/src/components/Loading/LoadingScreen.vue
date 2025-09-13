<template>
  <v-container class="fill-height ">
    <v-row >
      <v-col cols="12" >
        <v-card flat class="pa-6" color="transparent">         
          <span class="text-h7 mb-2 font-weight-bold">Chargement en cours</span>
          <p class="text-body-2 opacity-50 text-medium-emphasis mb-4">
            Veuillez patienter pendant le chargement de vos données...
          </p>

         
          <span class="text-caption text-medium-emphasis mb-4">{{ progressPercentage }}%</span>

          <v-progress-linear
            :model-value="progressPercentage"
            color="remplacement"
            height="4"
            class="mt-4 rounded-xl"
          ></v-progress-linear>
          <span class="text-caption text-medium-emphasis mb-2">{{ initializationStore.currentlyLoading }}</span>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { computed } from 'vue';
import { useInitializationStore } from '@/stores/initializationStore';

const initializationStore = useInitializationStore();

// Calculate progress percentage based on initialization state
const progressPercentage = computed(() => {
  const state = initializationStore.initializationState;
  const totalSteps = Object.keys(state).length;
  const completedSteps = Object.values(state).filter(Boolean).length;
  return Math.round((completedSteps / totalSteps) * 100);
});
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