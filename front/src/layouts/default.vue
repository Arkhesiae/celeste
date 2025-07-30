<template>
  <div class="transition-wrapper d-flex">


    <AppBar :showButtons="inScreen" @toggle-mobile-drawer="toggleMobileDrawer" @toggle-drawer="toggleDrawer"></AppBar>

    <DesktopNavigationDrawer v-model:navExpanded="navExpanded" />

    <MobileNavigationDrawer class="user-safe-area" v-model:modelValue="mobileDrawer" />

    <LoginButtons v-if="isDev" />

    <v-fade-transition mode="out-in">
      <LoadingScreen v-if="showLoadingScreen" class="loading-screen" />


      <v-main v-else position="relative" >
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <!-- <transition 
            @before-enter="beforeEnter"
            @before-leave="beforeLeave"
            @enter="onEnter"
            @leave="onLeave"
            @after-enter="onAfterEnter"
            @after-leave="onAfterLeave"

            
            > -->
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>

      </v-main>
    </v-fade-transition>
    <BottomNavigation />

    <GlobalSnackbar />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useInitializationStore } from '@/stores/initializationStore';
import DesktopNavigationDrawer from './components/DesktopNavigationDrawer.vue';
import MobileNavigationDrawer from './components/MobileNavigationDrawer.vue';
import AppBar from './components/AppBar.vue';
import LoginButtons from './components/LoginButtons.vue';
import GlobalSnackbar from './components/GlobalSnackbar.vue';
import BottomNavigation from './components/BottomNavigation.vue';


const isDev = ref(import.meta.env.DEV);
const initializationStore = useInitializationStore();

// Références
const navExpanded = ref(false);
const mobileDrawer = ref(false);
const inScreen = ref(false);
const theme = ref(false);
const showLoadingScreen = computed(() => initializationStore.isLoading);

// Fonctions
const toggleMobileDrawer = () => {
  mobileDrawer.value = !mobileDrawer.value;
};

const toggleDrawer = () => {
  navExpanded.value = !navExpanded.value;
};

// Fonction utilitaire pour appliquer les marges correctement
const applyMargins = (el) => {
  const vMain = el.closest('.v-main');
  const vMainStyle = vMain ? window.getComputedStyle(vMain) : null;
  const paddingTop = vMainStyle ? parseFloat(vMainStyle.paddingTop) : 0;
  const paddingLeft = vMainStyle ? parseFloat(vMainStyle.paddingLeft) : 0;
  const paddingRight = vMainStyle ? parseFloat(vMainStyle.paddingRight) : 0;
  const paddingBottom = vMainStyle ? parseFloat(vMainStyle.paddingBottom) : 0;

  el.style.position = 'absolute';
  el.style.top = `${paddingTop}px`;
  el.style.left = `${paddingLeft}px`;
  el.style.right = `${paddingRight}px`;

  el.style.width = `calc(100% - ${paddingLeft + paddingRight}px)`;


  return { paddingTop, paddingLeft, paddingRight, paddingBottom };
};

const beforeEnter = (el) => {
  // Délai avant de commencer la préparation

  // Préserver la hauteur du v-main basée sur le contenu actuel
  const vMain = el.closest('.v-main');
  if (vMain) {
    const currentHeight = vMain.scrollHeight;
    vMain.style.height = `${currentHeight}px`;
    vMain.classList.add('transitioning');
  }

  // Appliquer les marges et figer la vue
  applyMargins(el);
  el.style.transform = 'translateX(100%)';
  el.style.opacity = '1';
  el.style.zIndex = '1000';
  el.style.pointerEvents = 'none'; // Désactiver les interactions pendant la transition

};

const beforeLeave = (el) => {
  // Délai avant de commencer la préparation

  // Préserver la hauteur du v-main basée sur le contenu actuel
  const vMain = el.closest('.v-main');
  if (vMain) {
    const currentHeight = vMain.scrollHeight;
    vMain.style.height = `${currentHeight}px`;
    vMain.classList.add('transitioning');
  }

  // Appliquer les marges et figer la vue
  //applyMargins(el);
  el.style.zIndex = '1000';
  el.style.pointerEvents = 'none'; // Désactiver les interactions pendant la transition

};

// Animation JavaScript personnalisée
const onEnter = (el, done) => {
  // Appliquer les marges correctement
  applyMargins(el);

  // Forcer le reflow
  el.offsetHeight;

  // Définir la transition après le reflow
  el.style.transition = 'transform .5s ease-out, opacity .5s ease-out';

  // Délai avant de commencer l'animation

  // Animation d'entrée
  el.style.transform = 'translateX(0%)';
  el.style.opacity = '1';
  el.style.pointerEvents = 'auto'; // Réactiver les interactions

  // Délai avant de terminer
  setTimeout(done, 500);

};

const onLeave = (el, done) => {
  // Appliquer les marges et figer la vue

  el.style.transform = 'translateX(0%)';
  el.style.opacity = '1';
  el.style.zIndex = '1000';
  el.style.pointerEvents = 'none'; // Désactiver les interactions

  // Forcer le reflow
  el.offsetHeight;

  // Définir la transition après le reflow
  el.style.transition = 'transform .5s ease-out, opacity .5s ease-out';

  // Délai avant de commencer l'animation de sortie

  // Animation de sortie
  el.style.transform = 'translateX(-20%)';
  el.style.opacity = '0';

  // Délai avant de terminer
  setTimeout(done, 500);

};

const onAfterEnter = (el) => {
  // Restaurer la hauteur automatique du v-main
  const vMain = el.closest('.v-main');
  if (vMain) {
    vMain.style.height = '';
    vMain.classList.remove('transitioning');
  }

  // Nettoyer les styles après l'animation
  el.style.position = '';
  el.style.top = '';
  el.style.left = '';
  el.style.right = '';
  el.style.bottom = '';
  el.style.width = '';
  el.style.height = '';
  el.style.transform = '';
  el.style.opacity = '';
  el.style.zIndex = '';
  el.style.transition = '';
};

const onAfterLeave = (el) => {
  // Restaurer la hauteur automatique du v-main
  const vMain = el.closest('.v-main');
  if (vMain) {
    vMain.style.height = '';
    vMain.classList.remove('transitioning');
  }

  // Nettoyer les styles après l'animation
  el.style.position = '';
  el.style.top = '';
  el.style.left = '';
  el.style.right = '';
  el.style.bottom = '';
  el.style.width = '';
  el.style.height = '';
  el.style.transform = '';
  el.style.opacity = '';
  el.style.zIndex = '';
  el.style.transition = '';
};

</script>

<style scoped>
.user-safe-area {
  padding-top: env(safe-area-inset-top) !important;
}

.v-container {
  padding-top: env(safe-area-inset-top) !important;
}

.v-app-bar {
  padding-top: env(safe-area-inset-top) !important;
}

.v-navigation-drawer {
  padding-top: env(safe-area-inset-top) !important;
}

.v-main {
  position: relative !important;
  width: 100% !important;
  /* inherits width from parent */
  box-sizing: border-box;
}

/* Maintenir la hauteur du v-main quand les enfants sont en position absolute */
.v-main.transitioning {
  /* La hauteur sera définie dynamiquement par JavaScript */
}

.transition-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

a {
  text-decoration: none;
  color: transparent;
}

/* Slide transition styles */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform .4s ease-out;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-from {
  transform: translateX(-100%);
}

.slide-right-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.1s ease-out;
}

.fade-enter-from,
.fade-leave-to {

  opacity: 0;
}

.loading-screen {


  display: flex;
  justify-content: center;
  align-items: center;
  top: 0;
  left: 0;
  width: 100% !important;
  height: 100% !important;
  background-color: rgb(var(--v-theme-background));
  z-index: 1000;
}

</style>
