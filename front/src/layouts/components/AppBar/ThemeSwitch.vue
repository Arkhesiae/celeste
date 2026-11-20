<template>
  <v-switch v-model="isDark" hide-details false-icon="mdi-weather-sunny" true-icon="mdi-weather-night" />
</template>

<script setup>
import { useDarkMode } from '@/composables/useDarkMode';

const { isDark } = useDarkMode();
</script>

<style scoped>
:deep(.v-switch__track) {
  height: 24px !important;
  min-width: 44px !important;
  border: 1px solid rgba(var(--v-theme-outline), 0.55) !important;
  background: rgba(var(--v-theme-surfaceContainerHighest), 1) !important;
  opacity: 1 !important;
}

:deep(.v-switch__thumb) {
  height: 20px !important;
  width: 20px !important;
  background-color: rgb(var(--v-theme-primary)) !important;
  color: rgb(var(--v-theme-onPrimary)) !important;
}

:deep(.v-switch__thumb .v-icon) {
  color: rgb(var(--v-theme-onPrimary)) !important;
  opacity: 1 !important;
}
</style>
