<template>
  <v-chip-group 
    wrap
    :model-value="modelValue" 
    variant="flat"

    mandatory 
    class="" 
    :class="smAndDown ? ' ' : ' '"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-chip 
      v-for="filter in filters" 
      :key="filter.value" 
      class="justify-center ga-2 font-weight-medium align-center chip-custom"
      :size="'default'" 
      :class="filter.color ? 'chip-error' : ''"   
      active-class="active-filter" 
      variant="tonal" 
      rounded="pill"
      :value="filter.value"
    >
      {{ filter.label }}

      <template
        v-if="filter.count"
        #append
      >
        <span
          class="font-weight-bold "
          style="font-size: .685rem !important;"
        >{{ filter.count }}</span>
      </template>
    </v-chip>
  </v-chip-group>
</template>

<script setup>
import { useDisplay } from "vuetify";

defineProps({
    modelValue: {
        type: String,
        required: true
    },
    filters: {
        type: Array,
        required: true,
     
    }
});

defineEmits(['update:modelValue']);

const { smAndDown } = useDisplay();
</script>

<style scoped>
.chip-custom {
    background-color: rgba(var(--v-theme-surfaceContainerHigh), 1) !important;
    color: rgba(var(--v-theme-onBackground), 0.7) !important;
    font-size:.75rem !important;
}

.chip-custom.v-chip--selected {
    background-color: rgba(var(--v-theme-primary), 0.1) !important;
    color: rgba(var(--v-theme-primary), 0.8) !important;
}

.chip-custom.v-chip--selected.chip-error {
    background-color: rgba(var(--v-theme-error), 0.1) !important;
    color: rgba(var(--v-theme-error), 0.8) !important;
}

.chip-custom.v-chip--selected{
   
    border-radius: 12px !important;
}
</style>