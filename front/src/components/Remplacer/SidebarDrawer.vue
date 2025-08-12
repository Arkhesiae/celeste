<template>
    <v-slide-x-reverse-transition>
    <div
      class="d-flex"
      v-if="modelValue"
      style="
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        max-width: 600px;
        height: 100vh;
        z-index: 2500 !important;
        
        
        overflow-y: hidden;
      "
    >
    <v-sheet class="pa-6 w-100 d-flex flex-column">
      <v-card-item class="pa-0 ma-0 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
       
        </v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
        </template>
      </v-card-item>

      <div class="overflow-y-auto pa-0 flex-grow-1">
        <slot />
      </div>
    </v-sheet>
  </div>
  </v-slide-x-reverse-transition>
</template>

<script setup>
import { useDisplay } from 'vuetify';

const { smAndDown } = useDisplay();

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