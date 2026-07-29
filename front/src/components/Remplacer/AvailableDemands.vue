<template>
  <v-row class="0">
    <v-col cols="12">
      <div class="d-flex align-center justify-space-between">
        <FilterChipGroup v-model="selectedFilter" :filters="filters" :sort-options="sortOptions"
          :initial-sort="sortOptions[1]" @update:sort="sortBy = $event" />

      </div>
    </v-col>
  </v-row>
  <v-row>
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
        <DemandCard v-for="demand in demands" :key="demand._id" :demand="demand" class="pa-0 ma-0 "
          @handle-replacement="handleReplacement" @handle-switch="handleSwitch" @open-details="openDemandDetails" />
      </div>
    </v-col>
  </v-row>
</template>

<script setup>
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { sameDateKey } from '@/utils/dateKey';

const substitutionStore = useSubstitutionStore();
const props = defineProps({
  selectedDate: {
    type: [Date, String, null],
    default: null,
  }
})

const filteredSubstitutions = computed(() =>
  filterByDate(substitutionStore.availableSubstitutions)
);

const filteredSwitches = computed(() =>
  filterByDate(substitutionStore.availableSwitches)
);

/** Toutes les non-compatibles (y compris potentiellement compatibles) */
const filteredOthers = computed(() =>
  filterByDate(substitutionStore.otherDemands)
);

const allForDay = computed(() => [
  ...filteredSubstitutions.value,
  ...filteredSwitches.value,
  ...filteredOthers.value,
]);

const filters = computed(() => {
  const list = [
    {
      label: props.selectedDate ? 'Toutes' : 'Compatibles',
      value: props.selectedDate ? 'all' : 'compatibles',
      count: props.selectedDate
        ? allForDay.value.length
        : filteredSubstitutions.value.length + filteredSwitches.value.length,
    },
    { label: 'Remplaçables', value: 'remplacables', count: filteredSubstitutions.value.length },
    { label: 'Permutables', value: 'permutables', count: filteredSwitches.value.length },
    { label: 'Incompatibles', value: 'incompatibles', color: 'error', count: filteredOthers.value.length },
  ];
  // En mode jour : garder aussi Compatibles comme 2e filtre
  if (props.selectedDate) {
    list.splice(1, 0, {
      label: 'Compatibles',
      value: 'compatibles',
      count: filteredSubstitutions.value.length + filteredSwitches.value.length,
    });
  }
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

const filterByDate = (demands) => {
  if (!props.selectedDate) return [...demands];
  return demands.filter(d => sameDateKey(d.posterShift?.date, props.selectedDate));
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
    case 'all':
      result = allForDay.value;
      break;
    case 'remplacables':
      result = filteredSubstitutions.value;
      break;
    case 'permutables':
      result = filteredSwitches.value;
      break;
    case 'incompatibles':
      result = filteredOthers.value;
      break;
    case 'compatibles':
    default:
      result = [...filteredSubstitutions.value, ...filteredSwitches.value];
  }
  return sortDemands(result);
});

</script>

<style scoped></style>
