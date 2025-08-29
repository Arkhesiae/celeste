<template>
  <v-app class="app-container">
    <!-- <span class="safe-area-top" style=" z-index: 10000000;position:  absolute; top: 0; left: 0; width: 100%; background-color: red;">{{ safeAreaTop }}</span> -->
    <router-view v-slot="{ Component, route }">
      <transition :name="route.meta.transition || ''" mode="out-in">
        <component :is="Component" class="page" />
      </transition>
    </router-view>

  </v-app>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore.js";
import { useTheme } from 'vuetify';
import { useAppInitialization } from '@/composables/useAppInitialization';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { ref, onMounted } from 'vue';

const safeAreaTop = ref([]);
const safeAreaBottom = ref([]);


const authStore = useAuthStore();
const theme = useTheme();
const { initializeApp } = useAppInitialization();

onMounted(async () => {
  await getSafeAreaAndApply();
  await initializeApp();
  
});




async function getSafeAreaAndApply() {
  try {
    await SafeArea.getSafeAreaInsets().then(({ insets }) => {
      console.log(insets, 'insets');
      let top = insets.top;
      let bottom = insets.bottom;

      safeAreaTop.value.push(top);
      safeAreaBottom.value.push(bottom);
    
      for (const [key, value] of Object.entries(insets)) {
        document.documentElement.style.setProperty(
          `--safe-area-${key}`,
          `${value}px`,
        );
        document.documentElement.style.setProperty(
          `--safe-area-inset-${key}`,
          `${value}px`,
        );
        document.documentElement.style.setProperty(
          `safe-area-inset-${key}`,
          `${value}px`,
        );
      }

    });


    await SafeArea.getStatusBarHeight().then(({ statusBarHeight }) => {
      console.log(statusBarHeight, 'statusbarHeight');
    });

    await SafeArea.removeAllListeners();

    // when safe-area changed
    await SafeArea.addListener('safeAreaChanged', data => {
      const { insets } = data;
      console.log(insets, 'insets');
      let top = insets.top;

      safeAreaTop.value.push(top);
    
      for (const [key, value] of Object.entries(insets)) {
        document.documentElement.style.setProperty(
          `--safe-area-${key}`,
          `${value}px`,
        );
        document.documentElement.style.setProperty(
          `--safe-area-inset-${key}`,
          `${value}px`,
        );
        document.documentElement.style.setProperty(
          `safe-area-inset-${key}`,
          `${value}px`,
        );
      }
    });

  } catch (error) {

  }



}



</script>

<style>
.app-container {
  /* Marges de sécurité pour éviter le notch et les barres de statut */
  /* padding-top: var(--safe-area-top) !important; */

  /* padding-bottom: var(--safe-area-bottom) !important; */
  padding-left: var(--safe-area-left) !important;
  padding-right: var(--safe-area-right) !important;


}

.debug {
  border: 1px solid red;
}

/* Remove chrome autofill color from inputs */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  transition: background-color 50000000000s ease-in-out 0s;
}

/* :root {
  --inset-top: 80px;
  --inset-bottom: env(safe-area-inset-bottom);
}

body,
.v-navigation-drawer,
.v-overlay__content > .v-card {
  padding-top: var(--inset-top) !important;
  padding-bottom: var(--inset-bottom) !important;
}

.v-app-bar:not(.v-app-bar--bottom) {
  padding-top: var(--inset-top) !important;
}

.v-app-bar--bottom {
  padding-bottom: var(--inset-bottom) !important;
} */

/* Add this to your main CSS file or in the <style> section of your main Vue component */
.v-btn {
  text-transform: none;
  /* Optionally, add custom logic to capitalize only the first letter if needed */
}

/* Styles de transition globaux */
.slide-lefty-enter-active,
.slide-lefty-leave-active,
.slide-righty-enter-active,
.slide-righty-leave-active {
  transition: all 0.3s cubic-bezier(1.0, 0.5, 0.8, 1.0) !important;
}

.slide-lefty-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-lefty-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.slide-righty-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.slide-righty-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

@media (min-width: 1400px) {
  .v-container {
    max-width: 1400px;
  }
}


.slide-custom-enter-active,
.slide-custom-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
  position: relative;
  width: 100%;
  top: 0;
  left: 0;
}

.slide-custom-enter-from {
  left: 100%;
  opacity: 0;
}

.slide-custom-enter-to {
  left: 0;
  opacity: 1;
}

.slide-custom-leave-from {
  left: 0;
  opacity: 1;
}

.slide-custom-leave-to {
  left: -20%;
  opacity: 0;
}
</style>
