<template>
    <v-chip-group 
        :model-value="modelValue" 
        @update:model-value="$emit('update:modelValue', $event)"
        variant="flat"
        color="onBackground" 
        mandatory 
        class=""
        :class="smAndDown ? ' flex-grow-1' : 'justify-center '">
        
        <v-chip 
            class="justify-center font-weight-medium chip-custom" 
            :size="'default'" 
            :class="filter.color ? 'chip-error' : ''"
            v-for="filter in filters" 
            active-class="active-filter"   
            :key="filter.value" 
            variant="tonal" 
            rounded="pill"
            :value="filter.value">
            {{ filter.label }}
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
    background-color: rgba(var(--v-theme-surfaceContainer), 0.1) !important;
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
</style>