<template>
  <FilterChipGroup v-model="ownFilter" :filters="ownFilterOptions" />

  <div class="d-flex align-start flex-column justify-space-between mb-4 mt-4">
    <v-fade-transition mode="out-in">
      <v-card-title :key="currentTitle" class="text-body-large font-weight-medium text-medium-emphasis pa-0 mb-0">
        {{ currentTitle }}
      </v-card-title>
    </v-fade-transition>
    <v-slide-x-transition mode="out-in">
      <span :key="currentSubtitle" class="text-title-small text-disabled">
        <v-icon icon="mdi-information-outline" color="primary" size="16" class="mr-2" />
        {{ currentSubtitle }}
      </span>
    </v-slide-x-transition>
  </div>

  <div class="mb-4 d-flex flex-column">
    <v-slide-x-transition mode="out-in">
      <div :key="ownFilter" class="pa-0">
        <div v-if="demands.length > 0" class="d-flex flex-column ga-2">
          <OwnDemandCard
            v-for="(demand, index) in demands"
            :key="demand.id"
            :demand="demand"
            :small="true"
            @open-details="openDemandDetails"
            @cancel-demand="emit('cancelDemand', $event)"
            @withdraw-demand="emit('withdrawDemand', $event)"
          />
        </div>
        <div v-else class="text-center py-4">
          <UndrawTheVoid class="art-illustration art-illustration--static mb-2" style="width: 150px" />
          <div class="text-body-medium text-disabled">
            {{ emptyMessage }}
          </div>
        </div>
      </div>
    </v-slide-x-transition>
  </div>
</template>

<script setup>
import { posterDay } from '@/utils/dayFields.js';

import { useDemandStore } from '@/stores/demandStore.js';

const demandStore = useDemandStore();

// Props
defineProps({});

const ownFilter = ref('tous');

const ownFilterOptions = [
  {
    label: 'Toutes',
    value: 'tous',
    count: computed(() => pendingDemands.value.length + upcomingDemands.value.length + replacementDemands.value.length),
  },
  { label: 'En attente', value: 'en attente', count: computed(() => pendingDemands.value.length) },
  { label: 'A venir', value: 'a venir', count: computed(() => upcomingDemands.value.length) },
  {
    label: 'Je me fais remplacer',
    value: 'je me fais remplacer',
    count: computed(() => replacementDemands.value.length),
  },
];

// Emits
const emit = defineEmits(['openDetails', 'cancelDemand', 'withdrawDemand']);

const pendingDemands = computed(() => [
  ...demandStore.ownPendingHybridSubstitutions,
  ...demandStore.ownPendingTrueSubstitutions,
  ...demandStore.ownPendingTrueSwitches,
]);

const acceptedAsPoster = computed(() => demandStore.acceptedAsPoster);
const acceptedAsAccepter = computed(() => demandStore.acceptedAsAccepter);

// Demandes acceptées (section "A venir")
const upcomingDemands = computed(() => {
  const asPoster = acceptedAsPoster.value.filter((d) => d.accepterShift !== null);
  return [...asPoster, ...acceptedAsAccepter.value];
});

// Demandes "Je me fais remplacer"
const replacementDemands = computed(() => {
  return acceptedAsPoster.value.filter((d) => d.accepterShift === null);
});

// Configuration des filtres (titres et sous-titres)
const filterInfo = {
  tous: {
    title: 'Mes demandes',
    subtitle: 'Toutes les demandes me concernant sont affichées ici.',
  },
  'en attente': {
    title: 'En attente',
    subtitle: 'Mes demandes en attente sont affichées ici.',
  },
  'a venir': {
    title: 'A venir',
    subtitle: 'Les remplacements et permutations que je dois faire sont affichés ici.',
  },
  'je me fais remplacer': {
    title: 'Je me fais remplacer',
    subtitle: "Les remplacements que l'on effectue pour moi.",
  },
};

const currentTitle = computed(() => filterInfo[ownFilter.value]?.title || 'Mes demandes');
const currentSubtitle = computed(() => filterInfo[ownFilter.value]?.subtitle || '');

const sortDemands = (demands) => {
  return [...demands].sort((a, b) => (posterDay(a) ?? '').localeCompare(posterDay(b) ?? ''));
};

const demands = computed(() => {
  let result;
  switch (ownFilter.value) {
    case 'en attente':
      result = pendingDemands.value;
      break;
    case 'a venir':
      result = upcomingDemands.value;
      break;
    case 'je me fais remplacer':
      result = replacementDemands.value;
      break;
    default:
      result = [...pendingDemands.value, ...upcomingDemands.value, ...replacementDemands.value];
  }
  return sortDemands(result);
});

const EMPTY_MESSAGE = "C'est vide ici, aucune demande";

const openDemandDetails = (demand) => {
  emit('openDetails', demand);
};
</script>
