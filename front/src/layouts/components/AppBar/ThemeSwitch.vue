<template>
  <v-switch v-model="isDark" inset hide-details false-icon="mdi-weather-sunny" true-icon="mdi-weather-night" />
</template>

<script setup
        lang="ts">
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
:deep(.v-switch__track) {
  height: 24px !important;
  min-width: 44px !important;
  border: 1px solid rgba(173, 154, 154, 0.21);
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.v-switch__thumb) {
  height: 20px !important;
  width: 20px !important;
  background-color: rgba(var(--v-theme-primary), 1) !important;
  color: rgba(var(--v-theme-onPrimary), 1) !important;
}
</style>