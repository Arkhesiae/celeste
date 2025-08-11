<template>
  <v-navigation-drawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    location="right"
    width="600"
    temporary
    order="-10"
    style="z-index: 2500;"

  >
    <v-sheet class="pa-4 h-100 d-flex flex-column">
      <v-card-item class="pa-0 ma-0 mb-6">
        <v-card-title class="d-flex justify-space-between align-center">
          
        </v-card-title>
        <template #append>
          <v-btn 
            icon="mdi-close" 
            variant="text" 
            @click="$emit('update:modelValue', false)"
          />
        </template>
      </v-card-item>

      <div class="sidebar-content pb-16 overflow-y-auto flex-grow-0">
        <slot />
      </div>
    </v-sheet>
  </v-navigation-drawer>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);
</script>

<style scoped>

</style> 