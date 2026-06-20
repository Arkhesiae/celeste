<template>
  <v-card rounded="xl" elevation="0" class="mb-4 pa-6" :class="smAndDown ? 'mx-4' : 'mx-0'" color="surfaceContainer"
    to="/rotation">
    <div class="d-flex align-center justify-space-between">
      <div class="d-flex flex-column ga-2" style="flex: 1; min-width: 0;">
        <span class="text-caption text-uppercase text-disabled pa-0">
          Tour de service actif
        </span>

        <div v-if="loading" class="rotation-skeleton">
          <v-skeleton-loader type="text" class="rotation-skeleton__title" />
          <v-skeleton-loader width="50px" type="text" class="rotation-skeleton__subtitle" />
        </div>

        <div v-else>
          <div v-if="activeRotation">
            <div class="d-flex align-center justify-space-between mb-2">
              <div>
                <div class="text-h5 font-weight-medium">
                  {{ activeRotation.name }}
                </div>
                <div class="text-medium-emphasis">
                  Actif depuis le {{ new Date(activeRotation.activationDate).toLocaleDateString() }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-medium-emphasis">
            Aucun tour de service actif
          </div>
        </div>
      </div>

      <v-icon icon="mdi-chevron-right" color="primary" size="24" />
    </div>
  </v-card>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useRotationStore } from '@/stores/rotationStore.js';

const { smAndDown } = useDisplay();
const rotationStore = useRotationStore();

const loading = computed(() => rotationStore.loading); 
const activeRotation = computed(() => {
  return rotationStore.sortedRotations.find(rotation => rotation.status === 'active') || null;
});
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