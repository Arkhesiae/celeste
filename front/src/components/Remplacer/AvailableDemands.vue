<template>
  <v-row class="0">
    <v-col cols="12">
      <div class="d-flex align-center justify-space-between">
        <FilterChipGroup
          v-model="selectedFilter"
          :filters="filters"
        />
        <ListHeaderV2
          v-model:filter="selectedFilter"
          v-model:sort="sortBy"
          :sort-options="sortOptions"
          :initial-sort="sortOptions[1]"
        />
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
      <div
        v-else
        class="d-flex flex-column ga-2 mt-0"
      >
        <DemandCard
          v-for="demand in demands"
          :key="demand._id"
          :demand="demand"
          class="pa-0 ma-0 "
          @handle-replacement="handleReplacement"
          @handle-switch="handleSwitch"
          @open-details="openDemandDetails"
        />
      </div>
    </v-col>
  </v-row>
</template>

<script setup>
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
const substitutionStore = useSubstitutionStore();
const props = defineProps({
  selectedDate: {
    type: [Date, String, null],
  }
})


// Options de filtre
const filters = [
  { label: 'Toutes', value: 'all', count: computed(() => filteredSubstitutions.value.length + filteredSwitches.value.length + filteredOthers.value.length) },
  { label: 'Remplaçables', value: 'remplacables', count: computed(() => filteredSubstitutions.value.length) },
  { label: 'Permutables', value: 'permutables', count: computed(() => filteredSwitches.value.length) },
  // { label: 'Potentiellement compatibles', value: 'potentially', count: computed(() => filteredPotentiallyCompatible.value.length) },
  { label: 'Incompatibles', value: 'incompatibles', color: 'error', count: computed(() => filteredOthers.value.length) }
];

const selectedFilter = ref('all');

// Options de tri
const sortOptions = [
  { text: 'Type', value: 'type' },
  { text: 'Date', value: 'date' },
  { text: 'Vacation', value: 'shift.name' },
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

  if (props.selectedDate) {
    filteredDemands = filteredDemands.filter(demand => demand.posterShift.date === props.selectedDate);
  }

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

// const filteredPotentiallyCompatible = computed(() =>
//   filterAndSortDemands(substitutionStore.potentiallyCompatibleDemands)
// );

const filteredOthers = computed(() =>
  filterAndSortDemands(substitutionStore.otherDemands.filter(d => !d.potentiallyCompatible))
);

const demands = computed(() => {
  if (selectedFilter.value === 'all') return [...filteredSubstitutions.value, ...filteredSwitches.value, ...filteredOthers.value];
  if (selectedFilter.value === 'remplacables') return filteredSubstitutions.value;
  if (selectedFilter.value === 'permutables') return filteredSwitches.value;
  // if (selectedFilter.value === 'potentially') return filteredPotentiallyCompatible.value;
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