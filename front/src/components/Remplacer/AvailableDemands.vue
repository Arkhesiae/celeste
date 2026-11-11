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
      <div v-if="substitutionStore.loading" class="d-flex justify-center align-center py-8">
        <v-progress-circular indeterminate color="primary" size="36" />
      </div>
      <div v-else-if="demands.length === 0">
        <span class="text-medium-emphasis text-title-small">
          Aucune demande disponible
        </span>
      </div>
      <div v-else class="d-flex flex-column ga-2 mt-0">
        <DemandCard v-for="demand in filterByDate(demands)" :key="demand._id" :demand="demand" class="pa-0 ma-0 "
          @handle-replacement="handleReplacement" @handle-switch="handleSwitch" @open-details="openDemandDetails" />
      </div>
    </v-col>
  </v-row>
</template>

<script setup>
import { sameDateKey } from '@/utils/dateKey';
import { posterDay } from '@/utils/dayFields.js';
import { useSubstitutionStore } from "@/stores/substitutionStore.js";

const substitutionStore = useSubstitutionStore();
const props = defineProps({
  selectedDate: {
    type: [Date, String, null],
    default: null,
  }
})

const visible = ref(false)

const allRequests = computed(() => [
  ...substitutionStore.availableSubstitutions,
  ...substitutionStore.availableSwitches,
  ...substitutionStore.otherDemands,
]);

const compatibles  = computed(() => [...substitutionStore.availableSubstitutions, ...substitutionStore.availableSwitches])


const filters = computed(() => {
  const list = [
    { label: 'Compatibles', value: 'compatibles', count: compatibles.value.length},
    { label: 'Remplaçables', value: 'remplacables', count: substitutionStore.availableSubstitutions.length },
    { label: 'Permutables', value: 'permutables', count: substitutionStore.availableSwitches.length },
    { label: 'Incompatibles', value: 'incompatibles', color: 'error', count: substitutionStore.otherDemands.length },
    { label: 'Toutes', value: 'all', count: allRequests.value.length }
  ];

  return list;
});

const selectedFilter = ref(props.selectedDate ? 'all' : 'compatibles');

watch(
  () => props.selectedDate,
  (date) => {
    selectedFilter.value = date ? 'all' : 'compatibles';
  }
);

const sortOptions = [
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

const demands = computed(() => {
  let result;
  switch (selectedFilter.value) {
    case 'compatibles': result = compatibles.value; break;
    case 'remplacables': result = substitutionStore.availableSubstitutions; break;
    case 'permutables': result = substitutionStore.availableSwitches; break;
    case 'incompatibles': result = substitutionStore.otherDemands; break;
    default: result = allRequests.value; break;
  }
  return sortDemands(result);
});

const sortDemands = (demands) => {
  if (!sortBy.value) return demands;
  return [...demands].sort((a, b) => {
    switch (sortBy.value.tag) {
      case 'date':
        return (posterDay(a) ?? '').localeCompare(posterDay(b) ?? '');
      case 'shift.name':
        return a.posterShift.shift.name?.localeCompare(b.posterShift.shift.name);
      case 'shift.points':
        return a.points - b.points;
      default:
        return 0;
    }
  });
};

const filterByDate = (demands) => {
  if (!props.selectedDate) return [...demands];
  return demands.filter(d => sameDateKey(posterDay(d), props.selectedDate));
};

onMounted(() => {
  setTimeout(() => {
    visible.value = true
  }, 200)
})

</script>

