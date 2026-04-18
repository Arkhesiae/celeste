<template>
  <FilterChipGroup v-model="ownFilter" :filters="ownFilterOptions" />


  <div class="d-flex align-start flex-column justify-space-between mb-4 mt-4">
    <v-fade-transition mode="out-in">
      <v-card-title :key="currentTitle" class="text-h7 font-weight-medium  text-medium-emphasis pa-0 mb-0">
        {{ currentTitle }}
      </v-card-title>
    </v-fade-transition>
    <v-slide-x-transition mode="out-in">
      <span :key="currentSubtitle" class="text-subtitle-2 text-disabled">
        <v-icon icon="mdi-information-outline" color="primary" size="16" class="mr-2" />
        {{ currentSubtitle }}
      </span>
    </v-slide-x-transition>
  </div>

  <div class="mb-4 d-flex flex-column">
    <v-slide-x-transition mode="out-in">
      <div v-if="demands.length > 0 || emptyMessage" :key="ownFilter" class="pa-0">
        <div v-if="demands.length > 0" class="d-flex flex-column ga-2">
          <OwnDemandCard v-for="demand in demands" :key="demand.id" :is-poster="true" :demand="demand" :small="true"
            @open-details="openDemandDetails" />
        </div>
        <div v-else-if="emptyMessage" class="text-center py-4">
          <v-icon icon="mdi-tray-remove" size="small" class="mb-2" />
          <div class="text-body-2 text-disabled">
            {{ emptyMessage }}
          </div>
        </div>
      </div>
    </v-slide-x-transition>
  </div>
</template>

<script setup>

import { useSubstitutionStore } from "@/stores/substitutionStore.js";

const substitutionStore = useSubstitutionStore();

// Props
const props = defineProps({
  selectedFilter: {
    type: String,
    default: 'tous'
  }
});

const ownFilter = ref('tous');

const ownFilterOptions = [
  { label: 'Toutes', value: 'tous', count: computed(() => pendingDemands.value.length + upcomingDemands.value.length + replacementDemands.value.length) },
  { label: 'En attente', value: 'en attente', count: computed(() => pendingDemands.value.length) },
  { label: 'A venir', value: 'a venir', count: computed(() => upcomingDemands.value.length) },
  { label: 'Je me fais remplacer', value: 'je me fais remplacer', count: computed(() => replacementDemands.value.length) }
];

// Emits
const emit = defineEmits(['openDetails']);

const pendingDemands = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
]);

const acceptedAsPoster = computed(() => substitutionStore.acceptedAsPoster);
const acceptedAsAccepter = computed(() => substitutionStore.acceptedAsAccepter);

// Demandes acceptées (section "A venir")
const upcomingDemands = computed(() => {
  const asPoster = acceptedAsPoster.value.filter(d => d.accepterShift !== null);
  return [
    ...asPoster,
    ...acceptedAsAccepter.value
  ]
});

// Demandes "Je me fais remplacer"
const replacementDemands = computed(() => {
  return acceptedAsPoster.value.filter(d => d.accepterShift === null);
});

// Configuration des filtres (titres et sous-titres)
const filterInfo = {
  tous: {
    title: 'Mes demandes',
    subtitle: 'Toutes les demandes me concernant sont affichées ici.'
  },
  'en attente': {
    title: 'En attente',
    subtitle: 'Mes demandes en attente sont affichées ici.'
  },
  'a venir': {
    title: 'A venir',
    subtitle: 'Les remplacements et permutations que je dois faire sont affichés ici.'
  },
  'je me fais remplacer': {
    title: 'Je me fais remplacer',
    subtitle: 'Les remplacements que l\'on effectue pour moi.'
  }
};

const currentTitle = computed(() => filterInfo[ownFilter.value]?.title || 'Mes demandes');
const currentSubtitle = computed(() => filterInfo[ownFilter.value]?.subtitle || '');

const sortDemands = (demands) => {
  return [...demands].sort((a, b) => new Date(a.posterShift.date) - new Date(b.posterShift.date));
};

const demands = computed(() => {
  let result;
  switch (ownFilter.value) {
    case 'en attente': result = pendingDemands.value; break;
    case 'a venir': result = upcomingDemands.value; break;
    case 'je me fais remplacer': result = replacementDemands.value; break;
    default: result = [...pendingDemands.value, ...upcomingDemands.value, ...replacementDemands.value];
  }
  return sortDemands(result);
});

const emptyMessage = computed(() => {
  if (demands.value.length > 0) return null;
  return "C'est vide ici, aucune demande";
});

const openDemandDetails = (demand) => {
  emit('openDetails', demand);
};
</script>

<style scoped>
/* Styles spécifiques au composant si nécessaire */
</style>