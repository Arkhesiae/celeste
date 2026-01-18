<template>
  <v-row class="0">
    <v-col cols="12">
      <div class="d-flex align-center justify-space-between">
        <FilterChipGroup v-model="selectedFilter" :filters="filters" />
        <ListHeaderV2 v-model:filter="selectedFilter" v-model:sort="sortBy" :sort-options="sortOptions"
          :initial-sort="sortOptions[1]" />
      </div>
    </v-col>
  </v-row>
  <v-row v-if="visible">
    <v-col cols="12">
      <div v-if="demands.length === 0">
        <span class="text-medium-emphasis text-subtitle-2">
          Aucune demande disponible
        </span>
      </div>
      <div v-else class="d-flex flex-column ga-2 mt-0">
        <DemandCard v-for="demand in demands" :key="demand._id" :demand="demand" class="pa-0 ma-0 my-2"
          @handle-replacement="handleReplacement" @handle-switch="handleSwitch" @open-details="openDemandDetails" />
      </div>
    </v-col>
  </v-row>

</template>

<script setup>
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
const substitutionStore = useSubstitutionStore();



// Options de filtre
const filters = [
  { label: 'Remplaçables', value: 'remplacables' },
  { label: 'Permutables', value: 'permutables' },
  { label: 'Incompatibles', value: 'incompatibles', color: 'error' }
];

const selectedFilter = ref('remplacables');

// Options de tri
const sortOptions = [
  { text: 'Type', value: 'type' },
  { text: 'Date', value: 'date' },
  { text: 'Nom du shift', value: 'shift.name' },
  { text: 'Statut', value: 'status' },
];
const sortBy = ref(sortOptions[1]);


const emits = defineEmits(['open-details', 'handle-replacement', 'handle-switch']);

const openDemandDetails = (demand) => {
  emits('open-details', demand)
}

const handleReplacement = (demand) => {
  emits('handle-replacement', demand)
}

const handleSwitch = (demand) => {
  emits('handle-switch', demand)
}


// Fonction utilitaire pour le filtrage et le tri
const filterAndSortDemands = (demands) => {
  let filteredDemands = [...demands] || [];

  // Tri
  if (sortBy.value.value) {
    filteredDemands.sort((a, b) => {
      if (sortBy.value.value === 'date') {
        return new Date(a.posterShift.date) - new Date(b.posterShift.date);
      }
      if (sortBy.value.value === 'shift.name') {
        return a.posterShift?.name?.localeCompare(b.posterShift?.name);
      }
      if (sortBy.value.value === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  }

  return filteredDemands;
};

const filteredSubstitutions = computed(() =>
  filterAndSortDemands(substitutionStore.availableSubstitutions)
);

const filteredSwitches = computed(() =>
  filterAndSortDemands(substitutionStore.availableSwitches)
);

const filteredOthers = computed(() =>
  filterAndSortDemands(substitutionStore.otherDemands)
);

const demands = computed(() => {
  if (selectedFilter.value === 'remplacables') return filteredSubstitutions.value;
  if (selectedFilter.value === 'permutables') return filteredSwitches.value;
  if (selectedFilter.value === 'incompatibles') return filteredOthers.value;
  return [];
});

const visible = ref(false)

onMounted(() => {
  setTimeout(() => {
    visible.value = true
  }, 200)
})


</script>

<style scoped></style>