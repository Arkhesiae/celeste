<template>
  <v-row class="0">
    <v-col cols="12">
      <div class="d-flex align-center justify-space-between">
        <FilterChipGroup
          v-model="selectedFilter"
          v-model:sort="sortBy"
          v-model:sort-order="sortOrder"
          :filters="filters"
          :sort-options="sortOptions"
        />
      </div>
    </v-col>
  </v-row>
  <v-row v-if="visible">
    <v-col cols="12">
      <div v-if="demandStore.loading" class="d-flex justify-center align-center py-8">
        <v-progress-circular indeterminate color="primary" size="36" />
      </div>
      <div v-else-if="demands.length === 0" class="d-flex flex-column align-center ga-4 py-6">
        <UndrawAtTheAirport class="art-illustration art-illustration--static" style="width: 200px" />
        <span class="text-medium-emphasis text-title-small"> Aucune demande disponible </span>
      </div>
      <div v-else class="d-flex flex-column ga-2 mt-0">
        <DemandCard
          v-for="demand in filterByDate(demands)"
          :key="demand._id"
          :demand="demand"
          class="pa-0 ma-0"
          @handle-replacement="handleReplacement"
          @handle-switch="handleSwitch"
          @open-details="openDemandDetails"
        />
      </div>
    </v-col>
  </v-row>
</template>

<script setup>
import { sameDateKey } from '@/utils/dateKey';
import { posterDay } from '@/utils/dayFields.js';
import { useDemandStore } from '@/stores/demandStore.js';

const demandStore = useDemandStore();
const props = defineProps({
  selectedDate: {
    type: [Date, String, null],
    default: null,
  },
});

const visible = ref(false);

const allRequests = computed(() => [
  ...demandStore.availableSubstitutions,
  ...demandStore.availableSwitches,
  ...demandStore.otherDemands,
]);

const compatibles = computed(() => [...demandStore.availableSubstitutions, ...demandStore.availableSwitches]);

const filters = computed(() => {
  const list = [
    { label: 'Compatibles', value: 'compatibles', count: compatibles.value.length },
    { label: 'Remplaçables', value: 'remplacables', count: demandStore.availableSubstitutions.length },
    { label: 'Permutables', value: 'permutables', count: demandStore.availableSwitches.length },
    { label: 'Incompatibles', value: 'incompatibles', color: 'error', count: demandStore.otherDemands.length },
    { label: 'Toutes', value: 'all', count: allRequests.value.length },
  ];

  return list;
});

const selectedFilter = ref(props.selectedDate ? 'all' : 'compatibles');

watch(
  () => props.selectedDate,
  (date) => {
    selectedFilter.value = date ? 'all' : 'compatibles';
  },
);

const sortOptions = [
  { text: 'Date', tag: 'date' },
  { text: 'Vacation', tag: 'shift.name' },
  { text: 'Points', tag: 'shift.points' },
];
const sortBy = ref(sortOptions[1]);
const sortOrder = ref('asc');

const emits = defineEmits(['open-details', 'handle-replacement', 'handle-switch']);

const openDemandDetails = (demand) => {
  emits('open-details', demand);
};

const handleReplacement = (demand) => {
  emits('handle-replacement', demand);
};

const handleSwitch = (demand) => {
  emits('handle-switch', demand);
};

const demands = computed(() => {
  let result;
  switch (selectedFilter.value) {
    case 'compatibles':
      result = compatibles.value;
      break;
    case 'remplacables':
      result = demandStore.availableSubstitutions;
      break;
    case 'permutables':
      result = demandStore.availableSwitches;
      break;
    case 'incompatibles':
      result = demandStore.otherDemands;
      break;
    default:
      result = allRequests.value;
      break;
  }
  return sortDemands(result);
});

// Comparaison croissante de deux demandes selon le critère de tri
const compareBy = (tag, a, b) => {
  switch (tag) {
    case 'date':
      return (posterDay(a) ?? '').localeCompare(posterDay(b) ?? '');
    case 'shift.name':
      return a.posterShift.shift.name?.localeCompare(b.posterShift.shift.name);
    case 'shift.points':
      return a.points - b.points;
    default:
      return 0;
  }
};

const sortDemands = (demands) => {
  if (!sortBy.value) return demands;
  const direction = sortOrder.value === 'desc' ? -1 : 1;
  return [...demands].sort((a, b) => direction * compareBy(sortBy.value.tag, a, b));
};

const filterByDate = (demands) => {
  if (!props.selectedDate) return [...demands];
  return demands.filter((d) => sameDateKey(posterDay(d), props.selectedDate));
};

onMounted(() => {
  setTimeout(() => {
    visible.value = true;
  }, 200);
});
</script>
