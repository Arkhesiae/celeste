<template>
  <v-row class="0">
    <v-col cols="12">
      <div class="d-flex align-center justify-space-between">
        <FilterChipGroup v-model="selectedFilter" :filters="filters" :sort-options="sortOptions"
          :initial-sort="sortOptions[1]" @update:sort="sortBy = $event" />

      </div>
    </v-col>
  </v-row>
  <v-row v-if="visible">
    <v-col cols="12">
      <div v-if="demands.length === 0">
        <span class="text-medium-emphasis text-title-small">
          Aucune demande disponible
        </span>
      </div>
      <div v-else class="d-flex flex-column ga-2 mt-0">
        <DemandCard v-for="demand in demands" :key="demand._id" :demand="demand" class="pa-0 ma-0 "
          @handle-replacement="handleReplacement" @handle-switch="handleSwitch" @open-details="openDemandDetails" />
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
  { label: 'Incompatibles', value: 'incompatibles', color: 'error', count: computed(() => filteredOthers.value.length) }
];

const selectedFilter = ref('all');

// Options de tri
const sortOptions = [
  { text: 'Type', tag: 'type' },
  { text: 'Date', tag: 'date' },
  { text: 'Vacation', tag: 'shift.name' },
  { text: 'Points', tag: 'shift.points' },
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

const filteredSubstitutions = computed(() =>
  filterByDate(substitutionStore.availableSubstitutions)
);

const filteredSwitches = computed(() =>
  filterByDate(substitutionStore.availableSwitches)
);

const filteredOthers = computed(() =>
  filterByDate(substitutionStore.otherDemands.filter(d => !d.potentiallyCompatible))
);

const filterByDate = (demands) => {
  if (!props.selectedDate) return [...demands];
  return demands.filter(d => d.posterShift.date === props.selectedDate);
};

const sortDemands = (demands) => {
  if (!sortBy.value) return demands;
  return [...demands].sort((a, b) => {
    switch (sortBy.value.tag) {
      case 'date':
        return new Date(a.posterShift.date) - new Date(b.posterShift.date);
      case 'shift.name':
        return a.posterShift.shift.name?.localeCompare(b.posterShift.shift.name);
      case 'shift.points':
        return a.points - b.points;
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });
};

const demands = computed(() => {
  let result;
  switch (selectedFilter.value) {
    case 'remplacables': result = filteredSubstitutions.value; break;
    case 'permutables': result = filteredSwitches.value; break;
    case 'incompatibles': result = filteredOthers.value; break;
    default: result = [...filteredSubstitutions.value, ...filteredSwitches.value, ...filteredOthers.value];
  }
  return sortDemands(result);
});

const visible = ref(false)

onMounted(() => {
  setTimeout(() => {
    visible.value = true
  }, 200)
})


</script>

<style scoped></style>