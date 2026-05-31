<template>
  <v-slide-group :model-value="modelValue" mandatory @update:model-value="$emit('update:modelValue', $event)">
    <!-- Sort menu as first item -->


    <!-- Filter chips -->
    <v-slide-group-item
v-for="filter in filters" :key="filter.value" v-slot="{ isSelected, toggle }"
      :value="filter.value">
      <v-chip
class="justify-center font-weight-medium ga-2 align-center chip-custom"
        :class="[
        'chip-custom mr-2',
        isSelected && 'chip-selected',
        isSelected && filter.color && 'chip-error'
      ]" variant="tonal" rounded="pill" :selected="isSelected"
        @click="toggle">
        {{ filter.label }}
        <template v-if="filter.count" #append>
          <span class="font-weight-bold" style="font-size: .685rem !important;">
            {{ filter.count }}
          </span>
        </template>
      </v-chip>
    </v-slide-group-item>

    <v-slide-group-item v-if="sortOptions.length" disabled>
      <v-menu color="onBackground" rounded="lg">
        <template #activator="{ props }">
          <v-btn color="primary" variant="text" rounded="lg" v-bind="props">
            <span>{{ selectedSort ? selectedSort.text : sortLabel }}</span>
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        <v-list color="onBackground" bg-color="onBackground" rounded="xl" class="pa-4">
          <v-list-item v-for="option in sortOptions" :key="option.value" rounded="lg" @click="onSortChange(option)">
            <v-list-item-title>{{ option.text }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-slide-group-item>
  </v-slide-group>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  filters: {
    type: Array,
    default: () => []
  },
  sortOptions: {
    type: Array,
    default: () => []
  },
  sortLabel: {
    type: String,
    default: 'Trier par'
  },
  initialSort: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'update:sort']);

const selectedSort = ref(props.initialSort);

const onSortChange = (option) => {
  selectedSort.value = option;
  emit('update:sort', option);
};
</script>

<style scoped>
.chip-custom {
  margin-top: 2px;
  background-color: rgba(var(--v-theme-surfaceContainerHigh), 1) !important;
  color: rgba(var(--v-theme-onBackground), 0.7) !important;
  font-size: .75rem !important;
}

.chip-custom.chip-selected {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
  color: rgba(var(--v-theme-primary), 0.8) !important;
  border-radius: 12px !important;
}

.chip-custom.chip-selected.chip-error {
  background-color: rgba(var(--v-theme-error), 0.1) !important;
  color: rgba(var(--v-theme-error), 0.8) !important;
}

:deep(.v-slide-group__content) {
  display: flex !important;
  gap: 8px !important;
}
</style>