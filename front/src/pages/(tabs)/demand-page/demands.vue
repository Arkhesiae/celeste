<template>
  <v-container>
    <!-- En-tête -->

    
    <MainTitle  v-if="!smAndDown" title="Demandes" subtitle="Créer et consulter les demandes de rempla">
      <template #actions>
        <v-btn color="primary" prepend-icon="mdi-book-open-variant" @click="showRulesDialog = true">
          Règles de travail
        </v-btn>
      </template>
    </MainTitle>

    <!-- Mobile : bouton d'action flottant ; order="1" le place au-dessus de la barre de navigation du bas (même ordre 0 = dessous) -->
    

    <!-- 
    <v-alert v-if="!activeRotation" color="error" rounded="xl" class="mb-4 pa-4"
      icon="mdi-alert-outline" style="cursor: pointer;" @click="router.push('/profile/' + authStore.userData.userId)">
      <div class="d-flex align-center justify-space-between">
        <div>
          <v-card-title class="text-title-large font-weight-medium">Aucun tour de service actif</v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Aucun tour de service n'est actuellement actif.
            </div>
            <div>
              Sans tour de service actif, vous ne pourrez pas effectuer de remplacements ou de permutations. Veuillez
              contacter un administrateur pour activer un tour de service.
            </div>
          </v-card-text>
        </div>


      </div>
    </v-alert> -->

    <router-view />

    <RulesDialog v-model="showRulesDialog" />
  </v-container>
</template>

<script setup>
import { useScrollRestoration } from 'vue-router/experimental';

// Onglet du bas : racine de ses pages, il retrouve son défilement (router/scrollRestoration.js)
definePage({ meta: { tab: 'demands' } });
useScrollRestoration();

import { useDemandStore } from '@/stores/demandStore.js';

import { useDisplay } from 'vuetify';

const demandStore = useDemandStore();

const { smAndDown } = useDisplay();

const showRulesDialog = ref(false);

const refetchOnFocus = () => {
  if (demandStore.startDate && demandStore.endDate) {
    demandStore.fetchAllDemands({ startDate: demandStore.startDate, endDate: demandStore.endDate });
  }
};

onMounted(() => {
  window.addEventListener('focus', refetchOnFocus);
});

onUnmounted(() => {
  window.removeEventListener('focus', refetchOnFocus);
});
</script>

<style scoped>
:deep(.dashed > .v-timeline-divider > .v-timeline-divider__after) {
  border: none;
  margin-bottom: 3px;
  border-left: 2px dotted rgba(157, 194, 211, 0.21);
  background: none !important;
}

:deep(.dashed > .v-timeline-divider > .v-timeline-divider__before) {
  border: none;
  border-left: 2px dotted rgba(157, 194, 211, 0.23);
  background: none !important;
}

</style>
