<template>
  <!-- Carte du tour de service actif -->
  <v-card rounded="xl" elevation="0" class="mb-4 pa-6" :class="smAndDown ? 'mx-4' : 'mx-0'" color="surfaceContainer"
    style="cursor: pointer;" @click="$router.push('/rotation')">
    <div class="d-flex align-center justify-space-between">
      <div class="d-flex flex-column  ga-2">
        <span class="text-caption text-uppercase text-disabled pa-0">
          Tour de service actif
        </span>
        <div>
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

const activeRotation = computed(() => {
  return rotationStore.sortedRotations.find(rotation => rotation.status === 'active') || null;
});
</script>
