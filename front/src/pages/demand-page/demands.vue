<template>
  <v-container>
    <!-- En-tête -->
    <MainTitle title="Demandes" subtitle="Créer et consulter les demandes de rempla">
      <template #actions>
        <!-- Bouton pour afficher/masquer la colonne latérale sur mobile -->
        <div v-if="smAndDown" class="d-flex position-relative flex-column align-end ga-1">
          <v-btn color="primary" size="small" variant="text" append-icon="mdi-chevron-right"
            @click="showRulesDialog = true">
            Règles de travail
          </v-btn>
        </div>
        <div v-else>
          <v-btn color="primary" flat style="border-radius: 16px !important;" class="px-6" height="48" rounded="lg" prepend-icon="mdi-book-open-variant" @click="showRulesDialog = true">
            Règles de travail
          </v-btn>
        </div>
      </template>
    </MainTitle>

    <!-- 
    <v-alert v-if="!activeRotation" color="error" variant="tonal" rounded="xl" class="mb-4 pa-4"
      icon="mdi-alert-outline" style="cursor: pointer;" @click="router.push('/profile/' + authStore.userData.userId)">
      <div class="d-flex align-center justify-space-between">
        <div>
          <v-card-title class="text-h6 font-weight-medium">Aucun tour de service actif</v-card-title>
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



    <div v-if="smAndDown" class="d-flex align-center justify-center flex-1-1 flex-column ga-2"
      style="font-size: 0.75rem;">
      <!-- <div class="d-flex justify-center flex-column align-center ga-2 my-16">

        <v-icon icon="mdi-heart-outline" size="x-large" color="primary" style="opacity: 0.5;"></v-icon>
        <span v-if="unSeenDemands > 0">{{ unSeenDemands }} nouvelle(s) demande(s) disponible(s)</span>
        <span v-else>Aucune nouvelle demande</span>

      </div> -->
      <div class="d-flex justify-center flex-column align-center ga-2 my-8">
        <span>Des demandes sont disponibles</span>
      </div>
      <v-btn variant="flat" rounded="pill" style="font-size: 0.75rem;" color="surfaceContainer" class="flex-0-1"
        @click="router.push('/demand-page/standalone/available')">
        <template #prepend>
          <div class="d-flex  ga-1" style="right: 0px; top: -18px;">
            <div class="category-indicator"
              :title="`${substitutionStore.availableSubstitutions.length} demande(s) en attente`">
              <v-icon icon="mdi-account-arrow-left-outline" size="small" color="primary" />
              {{ substitutionStore.availableSubstitutions.length }}
            </div>
            <div class="category-indicator"
              :title="`${substitutionStore.availableSwitches.length} demande(s) permutable(s)`">
              <v-icon icon="mdi-swap-horizontal" size="small" color="primary" />
              {{ substitutionStore.availableSwitches.length }}
            </div>
            <div class="category-indicator"
              :title="`${substitutionStore.otherDemands.length} demande(s) incompatible(s)`">
              <v-icon icon="mdi-close" size="small" color="primary" />
              {{ substitutionStore.otherDemands.length }}
            </div>
          </div>
        </template>
        Voir tout
      </v-btn>
      <v-btn variant="flat" style="font-size: 0.75rem;" rounded="pill" color="surfaceContainer"
        @click="router.push('/demand-page/standalone/own')">
        Mes demandes
        <template #prepend>
          <div class="d-flex  ga-1" style="right: 0px; top: -18px;">
            <div v-if="pendingDemands.length > 0" class="category-indicator"
              :title="`${pendingDemands.length} demande(s) en attente`">
              <v-icon icon="mdi-help" size="small" color="primary" />
              {{ pendingDemands.length }}
            </div>
            <div v-if="acceptedAsPoster?.length > 0" class="category-indicator"
              :title="`${acceptedAsPoster.length} demande(s) acceptée(s)`">
              <v-icon icon="mdi-check" size="small" color="primary" />
              {{ acceptedAsPoster.length + acceptedAsAccepter.length }}
            </div>
          </div>
        </template>
      </v-btn>
    </div>


    <router-view v-if="!smAndDown" />

    <RulesDialog v-model="showRulesDialog" />
  </v-container>
</template>

<route lang="yaml">
  meta:
    layout: default
</route>

<script setup>

import { useSubstitutionStore } from "@/stores/substitutionStore.js";


import { useDisplay } from "vuetify";
import { useRouter } from 'vue-router';


// const unSeenDemands = ref(0);

// Stores
const substitutionStore = useSubstitutionStore();

const { smAndDown } = useDisplay();

const router = useRouter();
// État local


const showRulesDialog = ref(false);




// Données de la demande
const pendingDemands = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
]);

const acceptedAsPoster = computed(() => substitutionStore.acceptedAsPoster);
const acceptedAsAccepter = computed(() => substitutionStore.acceptedAsAccepter);








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

.remplacement-fab-tonal {
  background-color: #e5e4ec !important;
}

:deep(.fab > .v-fab__container > button) {
  border-radius: 16px !important;
}

:deep(.v-fab__container) {
  margin-right: 16px !important;
  margin-bottom: 96px !important;
}

/* Indicateurs de catégories */
.category-indicator {
  padding: 0 8px;
  height: 16px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: .75rem;

  cursor: pointer;
  transition: all 0.2s ease;
}

.category-indicator:hover {
  transform: scale(1.1);
}

.category-indicator.pending {
  background-color: rgb(var(--v-theme-pendingDemand));
  color: rgb(var(--v-theme-onPendingDemand));
}

.category-indicator.accepted {
  background-color: rgb(var(--v-theme-acceptedDemand));
  color: rgb(var(--v-theme-onAcceptedDemand));
}

.category-indicator.todo {
  background-color: rgb(var(--v-theme-remplacement));
  color: rgb(var(--v-theme-background));
}
</style>
