<template>
  <v-card
    rounded="xl"
    elevation="0"
    class="mb-4 pa-6"
    :class="smAndDown ? 'mx-4' : 'mx-0'"
    color="surfaceContainer"
    @click="rotationsDialog = true"
  >
    <div class="d-flex align-center justify-space-between">
      <div class="d-flex flex-column ga-2" style="flex: 1; min-width: 0">
        <span class="text-body-small text-uppercase text-disabled pa-0"> Tour de service actif </span>

        <div v-if="loading" class="rotation-skeleton">
          <v-skeleton-loader type="text" class="rotation-skeleton__title" />
          <v-skeleton-loader width="50px" type="text" class="rotation-skeleton__subtitle" />
        </div>

        <div v-else>
          <div v-if="activeRotation">
            <div class="d-flex align-center justify-space-between mb-2">
              <div>
                <div class="text-headline-small font-weight-medium">
                  {{ activeRotation.name }}
                </div>
                <div class="text-medium-emphasis">
                  Actif depuis le {{ formatDay(activationDay(activeRotation), undefined, undefined) }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-medium-emphasis">Aucun tour de service actif</div>
        </div>
      </div>

      <v-icon icon="mdi-chevron-right" color="primary" size="24" />
    </div>

    <!-- La page des tours de service, en plein écran (la même que /rotation) -->
    <GenericDialog v-model="rotationsDialog" title="Tours de service" fullscreen max-width="100%">
      <template #content>
        <RotationsView v-if="rotationsDialog" :center-id="authStore.userData.centerId" embedded />
      </template>
    </GenericDialog>
  </v-card>
</template>

<script setup>
import { formatDay, activationDay } from '@/utils/dayFields.js';
import { useDisplay } from 'vuetify';
import { useRotationStore } from '@/stores/rotationStore.js';
import { useAuthStore } from '@/stores/authStore.js';

const { smAndDown } = useDisplay();
const rotationStore = useRotationStore();
const authStore = useAuthStore();

const rotationsDialog = ref(false);

const loading = computed(() => rotationStore.loading);
// Le tour de service actif du centre de l'utilisateur, au jour courant de ce centre
const activeRotation = computed(() => rotationStore.getActiveRotationForCenter(authStore.userData.centerId));
</script>

<style scoped>
.rotation-skeleton {
  margin-bottom: 8px; /* matches the .mb-2 on the real title block */
}

.rotation-skeleton :deep(.v-skeleton-loader) {
  background: transparent;
}

.rotation-skeleton__title :deep(.v-skeleton-loader__text) {
  height: 28px;
  width: 180px;
  margin: 0;
  margin-bottom: 8px;
  margin-right: 20px;
}

.rotation-skeleton__subtitle :deep(.v-skeleton-loader__text) {
  height: 16px;
  width: 220px;
  margin: 0;
  margin-bottom: 0;
}
</style>
