<template>
  <v-app class="app-container">
    <router-view />

    <!-- Assistance : une fenêtre, ouverte de partout par useAssistanceStore().open() -->
    <AssistanceDialog />
  </v-app>
</template>

<script setup>
import { useAppInitialization } from '@/composables/useAppInitialization';
import { SafeArea } from 'capacitor-plugin-safe-area';

const { initializeCenters } = useAppInitialization();

// Zones de sécurité de l'appareil (encoche, barres du système) en variables CSS : `--safe-area-top`, `--safe-area-bottom`...
const applyInsets = (insets) => {
  for (const [key, value] of Object.entries(insets)) {
    document.documentElement.style.setProperty(`--safe-area-${key}`, `${value}px`);
    document.documentElement.style.setProperty(`--safe-area-inset-${key}`, `${value}px`);
    document.documentElement.style.setProperty(`safe-area-inset-${key}`, `${value}px`);
  }
};

const watchSafeArea = async () => {
  try {
    const { insets } = await SafeArea.getSafeAreaInsets();
    applyInsets(insets);

    await SafeArea.removeAllListeners();
    await SafeArea.addListener('safeAreaChanged', ({ insets: changed }) => applyInsets(changed));
  } catch {
    // Sans le plugin natif (navigateur), les variables gardent leur valeur par défaut
  }
};

onMounted(async () => {
  await watchSafeArea();
  await initializeCenters();
});
</script>

<style>
.app-container {
  /* Marges de sécurité sur les côtés (encoche en paysage) */
  padding-left: var(--safe-area-left) !important;
  padding-right: var(--safe-area-right) !important;
}

/* Remove chrome autofill color from inputs */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  transition: background-color 50000000000s ease-in-out 0s;
}

.v-btn {
  text-transform: none;
}

@media (min-width: 1400px) {
  .v-container {
    max-width: 1400px;
  }
}
</style>
