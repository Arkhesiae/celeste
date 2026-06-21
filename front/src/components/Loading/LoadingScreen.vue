<template>
  <v-container class="fill-height d-flex align-center flex-wrap">
    <v-row>
      <v-col
        cols="12"
        class="d-flex justify-center align-center"
      >
        <div
          class="d-flex justify-center align-center flex-column pa-6 "
          style="max-width: 600px;"
        >
          <img
            src="@/assets/Orly1.png"
            class="img"
          >
          <div class="progress-container">
            <!-- <span class="text-body-large mb-2 font-weight-bold">Chargement en cours</span>
          <p class="text-body-medium opacity-50 text-medium-emphasis mb-4">
            Veuillez patienter pendant le chargement de vos données...
          </p> -->


            <!-- <span class="text-body-small text-medium-emphasis mb-4">{{ progressPercentage }}%</span> -->

            <v-progress-linear
              indeterminate
              :model-value="progressPercentage"
              color="primary"
              height="4"
              class="mt-4 rounded-xl "
            />
            <!-- <span class="text-body-small text-medium-emphasis mb-2">{{ initializationStore.lastLoaded || 'Chargement en cours' }}</span> -->
          </div>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>

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


.img-desktop {
  z-index: -2;
  width: 70%;
  height: 100%;
  object-fit: cover;
  left: 25px;
  top: 0px;
  position: absolute;
}

.img {
  max-width: 330px;
  width: 100%;

}

.img-mobile-xs {
  width: 300px;
  object-fit: cover;
  position: absolute;
  right: -100px;
}

.progress-container {
  width: 100%;
  max-width: 200px;

}
</style> 