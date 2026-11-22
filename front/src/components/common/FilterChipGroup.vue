<template>
  <div class="filter-chip-group d-flex flex-column ga-2">
    <v-slide-group v-model="modelValue" mandatory>
      <!-- Filtres : un seul est choisi à la fois (la valeur du v-model) -->
      <v-slide-group-item
        v-for="filter in filters"
        :key="filter.value"
        v-slot="{ isSelected, toggle }"
        :value="filter.value"
      >
        <v-chip
          class="justify-center font-weight-medium ga-1 align-center chip-custom"
          :class="['chip-custom mr-2', isSelected && 'chip-selected', isSelected && filter.color && 'chip-error']"
          variant="tonal"
          rounded="pill"
          :selected="isSelected"
          @click="toggle"
        >
          <div class="d-flex align-center ga-1 text-label-medium">
            <v-icon v-if="isSelected">mdi-check</v-icon>

            {{ filter.label }}
          </div>
          <template v-if="filter.count" #append>
            <span class="font-weight-bold" style="font-size: 0.685rem !important">
              {{ filter.count }}
            </span>
          </template>
        </v-chip>
      </v-slide-group-item>
    </v-slide-group>

    <!-- Tri, sur sa propre ligne : le critère et l'ordre choisis sont deux v-model de plus -->
    <SortSplitButton
      v-if="sortOptions.length"
      v-model:sort="sort"
      v-model:order="sortOrder"
      class="align-self-start"
      :options="sortOptions"
      :label="sortLabel"
    />
  </div>
</template>

<script setup>
// Trois liaisons à double sens : le filtre choisi (`v-model`, la valeur d'un des `filters`), le critère de tri choisi (`v-model:sort`, un des
// `sortOptions`, objets `{ text, tag }`) et l'ordre (`v-model:sort-order`, 'asc' ou 'desc'). Sans liaison du parent, chacun garde son état ici.
const modelValue = defineModel({ type: String, required: true });
const sort = defineModel('sort', { type: Object, default: null });
const sortOrder = defineModel('sortOrder', { type: String, default: 'asc' });

const props = defineProps({
  filters: {
    type: Array,
    default: () => [],
  },
  sortOptions: {
    type: Array,
    default: () => [],
  },
  sortLabel: {
    type: String,
    default: 'Trier par',
  },
});

// sans critère choisi au départ, le premier
if (!sort.value && props.sortOptions.length) sort.value = props.sortOptions[0];
</script>

<style scoped>
/* Dans un conteneur flex (ici et chez le parent) un élément ne descend pas sous la largeur de son contenu (`min-width: auto`) : le groupe de chips
   prenait alors la largeur de tous ses chips au lieu de celle disponible, et ne défilait plus. `min-width: 0` lui rend la largeur de son parent. */
.filter-chip-group {
  width: 100%;
  min-width: 0;
}

.filter-chip-group :deep(.v-slide-group) {
  min-width: 0;
  max-width: 100%;
}

.chip-custom {
  background-color: rgba(var(--v-theme-surfaceContainerHigh), 1) !important;
  color: rgba(var(--v-theme-onBackground), 0.7) !important;
  font-size: 0.75rem !important;
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
</style>
