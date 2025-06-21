<template>
  <v-switch 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event)"
    inset 
    hide-details 
    false-icon="mdi-weather-sunny"
    true-icon="mdi-weather-night"
  />
</template>

<script setup>
// Props
defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

// Emits
defineEmits(['update:modelValue']);
</script>

<style scoped>
:deep(.v-switch__track) {
  height: 24px !important;
  border: 1px solid rgba(173, 154, 154, 0.21);
  min-width: 44px !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.v-switch__thumb) {
  height: 20px !important;
  width: 20px !important;
}
</style> 