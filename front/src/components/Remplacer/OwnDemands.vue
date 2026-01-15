<template>
  <!-- Filtre de section -->
  

  <!-- Section unique de titre et sous-titre avec transition -->
  <div class="d-flex align-start flex-column justify-space-between mb-4">
    <v-fade-transition mode="out-in">
      <v-card-title
        :key="currentTitle"
        class="text-h6 font-weight-medium pa-0 mb-0"
      >
        {{ currentTitle }}
      </v-card-title>
    </v-fade-transition>
    <v-slide-x-transition mode="out-in">
      <span
        :key="currentSubtitle"
        class="text-subtitle-2 text-medium-emphasis"
      >
        <v-icon
          icon="mdi-information-outline"
          color="remplacement"
          size="16"
          class="mr-2"
        />
        {{ currentSubtitle }}
      </span>
    </v-slide-x-transition>
  </div>

  <!-- Section "En attente" -->
  <div
    v-if="showPendingSection"
    class="mb-4 d-flex flex-column"
  >
    <v-expand-transition>
      <v-card-text
        v-if="pendingDemands.length > 0"
        class="pa-0"
      >
        <div
          v-if="pendingDemands.length > 0"
          class="d-flex flex-column ga-2"
        >
          <OwnDemandCard
            v-for="demand in pendingDemands"
            :key="demand.id"
            :is-poster="true"
            :demand="demand"
            :small="true"
            @open-details="openDemandDetails"
          />
        </div>
        <div
          v-else
          class="text-center py-4"
        >
          <v-icon
            icon="mdi-check-circle-outline"
            color="success"
            size="large"
            class="mb-2"
          />
          <div class="text-body-1">
            Aucune demande en attente
          </div>
        </div>
      </v-card-text>
    </v-expand-transition>
  </div>

 
     
    
  <div
    v-if="showUpcomingSection"
    class="mb-4 d-flex flex-column"
  >
    <v-expand-transition>
      <v-card-text
        v-if="upcomingDemands.length > 0"
        class="pa-0"
      >
        <div
          v-if="upcomingDemands.length > 0"
          class="d-flex flex-column ga-2"
        >
          <OwnDemandCard
            v-for="demand in upcomingDemands"
            :key="
              demand.id"
            :is-poster="true"
            :demand="demand"
            :small="true"
            @open-details="openDemandDetails"
          />
        </div>
        <div
          v-else
          class="text-center py-4"
        >
          <v-icon
            icon="mdi-check-circle-outline"
            color="success"
            size="large"
            class="mb-2"
          />
          <div class="text-body-1">
            Aucune demande en attente
          </div>
        </div>
      </v-card-text>
    </v-expand-transition>
  </div>

  <div
    v-if="showReplacementSection"
    class="mb-4 d-flex flex-column"
  >
    <v-expand-transition>
      <v-card-text class="pa-0">
        <div
          v-if="replacementDemands.length > 0"
          class="d-flex flex-column ga-2"
        >
          <OwnDemandCard
            v-for="demand in replacementDemands"
            :key="
              demand.id"
            :is-poster="true"
            :demand="demand"
            :small="true"
            @open-details="openDemandDetails"
          />
        </div>
      </v-card-text>
    </v-expand-transition>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
const substitutionStore = useSubstitutionStore();

// Props
const props = defineProps({
  selectedFilter: {
    type: String,
    default: 'tous'
  }
});

// Emits
const emit = defineEmits(['openDetails']);


const pendingDemands = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
]);

const acceptedAsPoster = computed(() => substitutionStore.acceptedAsPoster);
const acceptedAsAccepter = computed(() => substitutionStore.acceptedAsAccepter);




// Déterminer quelles sections afficher selon le filtre
const showPendingSection = computed(() => {
  return props.selectedFilter === 'tous' || props.selectedFilter === 'en attente';
});

const showUpcomingSection = computed(() => {
  return props.selectedFilter === 'tous' || props.selectedFilter === 'a venir';
});

const showReplacementSection = computed(() => {
  return props.selectedFilter === 'tous' || props.selectedFilter === 'je me fais remplacer';
});

// Demandes acceptées (section "A venir")
const upcomingDemands = computed(() => {
  // 1. Filtrer les demandes où l'utilisateur est le Poster
  const asPoster = acceptedAsPoster.value.filter(d => d.accepterShift !== null);
  // 2. Fusionner les demandes filtrées du Poster avec toutes les demandes du Demander
  return [
    ...asPoster,
    ...acceptedAsAccepter.value
  ].sort((a, b) => new Date(a.posterShift.date) - new Date(b.posterShift.date));
});

// Demandes "Je me fais remplacer"
const replacementDemands = computed(() => {
  return acceptedAsPoster.value.filter(d => d.accepterShift === null);
});


// Titre et sous-titre dynamiques selon le filtre
const currentTitle = computed(() => {
  switch (props.selectedFilter) {
    case 'en attente':
      return 'En attente';
    case 'a venir':
      return 'A venir';
    case 'je me fais remplacer':
      return 'Je me fais remplacer';
    default:
      return 'Mes demandes';
  }
});

const currentSubtitle = computed(() => {
  switch (props.selectedFilter) {
    case 'en attente':
      return 'Mes demandes en attente sont affichées ici.';
    case 'a venir':
      return 'Les remplacements et permutations que je dois faire sont affichés ici.';
    case 'je me fais remplacer':
      return 'Les remplacements que l\'on effectue pour moi.';
    default:
      return 'Toutes les demandes me concernant sont affichées ici.';
  }
});

const openDemandDetails = (demand) => {
  console.log('openDemandDetails', demand);
  emit('openDetails', demand);
};

</script>

<style scoped>
/* Styles spécifiques au composant si nécessaire */
</style>