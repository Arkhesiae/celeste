<template>
  <v-switch
    v-model="isDark"
    inset
    hide-details
    color="primary"
    base-color="onSurface"
    false-icon="mdi-weather-sunny"
    true-icon="mdi-weather-night"
    class="theme-switch"
  />
</template>

<script setup lang="ts">
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/authStore'

const theme = useTheme()
const authStore = useAuthStore()

const isDark = computed<boolean>({
  get: () => theme.global.current.value.dark,
  set: (dark) => {
    theme.change(dark ? 'darkTheme' : 'lightTheme')
    authStore.updateUserPreferences({ theme: dark })
  },
})
</script>

<style scoped>
.theme-switch {
  opacity: 1;
}

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
