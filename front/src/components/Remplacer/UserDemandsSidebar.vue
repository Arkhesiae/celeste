<template>
  <div class="d-flex flex-column ga-2" style="position: sticky !important; top: 200px !important;">
    <div class="mb-4 d-flex flex-column">
      <div class="d-flex align-start flex-column justify-space-between mb-4">
        <v-card-title class="text-h6 font-weight-medium pa-0 mb-0">En attente</v-card-title>
        <span class="text-subtitle-2 text-medium-emphasis">
          <v-icon icon="mdi-information-outline" color="remplacement" size="16" class="mr-2" />
          Mes demandes en attente sont affichées ici.
        </span>
      </div>
      <v-expand-transition>
        <v-card-text class="pa-0" v-if="pendingDemands.length > 0">
          <div v-if="pendingDemands.length > 0" class="d-flex flex-column ga-2">
            <OwnDemandCard :isPoster="true" v-for="demand in pendingDemands" :key="demand.id" :demand="demand"
              :small="true" />
          </div>
          <div v-else class="text-center py-4">
            <v-icon icon="mdi-check-circle-outline" color="success" size="large" class="mb-2" />
            <div class="text-body-1">Aucune demande en attente</div>
          </div>
        </v-card-text>
      </v-expand-transition>
    </div>

    <!-- Demandes en attente -->
    <!--     <v-card v-if="pendingDemands.length > 0" rounded="0" elevation="0" color="transparent" class="pa-0 ma-0">
      <div class="mb-2">
        <span class="ma-0 mb-2 pa-0 text-body-1 font-weight-medium">En attente</span>
      </div>

    </v-card> -->

    <!-- Demandes acceptées -->
    <!--     <v-card v-if="acceptedAsPoster?.length > 0" rounded="0" elevation="0" color="transparent" class="pa-0 mt-4">
      <div class="mb-2">
        <span class="pa-0 mb-2 text-body-1 font-weight-medium">Acceptées</span>
      </div>

      <v-expand-transition>
        <v-card-text class="pa-0" v-if="acceptedAsPoster?.length > 0">
          <div v-if="acceptedAsPoster.length > 0" class="d-flex flex-column ga-2">
            <OwnDemandCard :isPoster="true" v-for="demand in acceptedAsPoster.filter(d => d.type != 'hybrid')"" :key="
              demand.id" :demand="demand" :small="true" />
          </div>
          <div v-else class="text-center py-4">
            <v-icon icon="mdi-check-circle-outline" color="success" size="large" class="mb-2" />
            <div class="text-body-1">Aucune demande en attente</div>
          </div>
        </v-card-text>
      </v-expand-transition>
    </v-card> -->

    <!-- Section "A venir" -->
    <div class="d-flex align-start flex-column justify-space-between my-4 mt-16">
      <v-card-title class="text-h6 font-weight-medium pa-0 mb-0">A venir</v-card-title>
      <span class="text-subtitle-2 text-medium-emphasis">
        <v-icon icon="mdi-information-outline" color="remplacement" size="16" class="mr-2" />
        Les remplacements et permutations que je dois faire sont affichés ici.
      </span>
    </div>
    <v-card v-if="acceptedAsPoster?.length > 0" rounded="0" elevation="0" color="transparent" class="pa-0 mt-4">
      <v-expand-transition>
        <v-card-text class="pa-0" v-if="acceptedAsPoster?.length > 0">
          <div v-if="acceptedAsPoster.length > 0" class="d-flex flex-column ga-2">
            <OwnDemandCard :isPoster="true" v-for="demand in acceptedAsPoster.filter(d => d.type != 'hybrid')"" :key="
              demand.id" :demand="demand" :small="true" />
          </div>
          <div v-else class="text-center py-4">
            <v-icon icon="mdi-check-circle-outline" color="success" size="large" class="mb-2" />
            <div class="text-body-1">Aucune demande en attente</div>
          </div>
        </v-card-text>
      </v-expand-transition>
    </v-card>
    <v-card rounded="0" elevation="0" color="transparent" class="pa-0 mt-4"
      style="position: sticky !important; top: 400px !important;">
      <v-expand-transition>
        <v-card-text class="pa-0">
          <div v-if="acceptedAsAccepter.length > 0" class="d-flex flex-column ga-2">
            <OwnDemandCard :isPoster="false" v-for="demand in acceptedAsAccepter" :key="demand.id" :demand="demand"
              :small="true" />
          </div>
        </v-card-text>
      </v-expand-transition>
    </v-card>

    <!-- Section "Je me fais remplacer" -->
    <div class="d-flex align-start flex-column justify-space-between my-4 mt-16">
      <v-card-title class="text-h6 font-weight-medium pa-0 mb-0">Je me fais remplacer</v-card-title>
      <span class="text-subtitle-2 text-medium-emphasis">
        <v-icon icon="mdi-information-outline" color="remplacement" size="16" class="mr-2" />
        Les remplacements que l'on effectue pour moi.
      </span>
    </div>

    <v-card rounded="0" elevation="0" color="transparent" class="pa-0 mt-4"
      style="position: sticky !important; top: 400px !important;">
      <v-expand-transition>
        <v-card-text class="pa-0">
          <div v-if="acceptedAsAccepter.length > 0" class="d-flex flex-column ga-2">
            <OwnDemandCard :isPoster="true" v-for="demand in acceptedAsPoster.filter(d => d.type === 'hybrid')"" :key="
              demand.id" :demand="demand" :small="true" />
          </div>
        </v-card-text>
      </v-expand-transition>
    </v-card>
  </div>
</template>

<script setup>


// Props
const props = defineProps({
  pendingDemands: {
    type: Array,
    default: () => []
  },
  acceptedAsPoster: {
    type: Array,
    default: () => []
  },
  acceptedAsAccepter: {
    type: Array,
    default: () => []
  }
});
</script>

<style scoped>
/* Styles spécifiques au composant si nécessaire */
</style>