<template>
  <div class="transition-wrapper d-flex">
    <AppBar
      :show-buttons="inScreen"
      :is-mobile-drawer-open="mobileDrawer"
      @toggle-mobile-drawer="toggleMobileDrawer"
      @toggle-drawer="toggleDrawer"
    />

    <template v-if="navigation">
      <DesktopNavigationDrawer2 />

      <MobileNavigationDrawer v-model:model-value="mobileDrawer" class="user-safe-area" />
    </template>

    <LoginButtons v-if="isDev" />

    <v-main>
      <router-view v-slot="{ Component, route }">
        <transition :name="'fade'" mode="out-in" @enter="scroll">

          <!-- <transition 
            @before-enter="beforeEnter"
            @before-leave="beforeLeave"
            @enter="onEnter"
            @leave="onLeave"
            @after-enter="onAfterEnter"
            @after-leave="onAfterLeave"
            :name="route.meta.transition || ''"
            > -->

          <component :is="Component" />
        </transition>
      </router-view>
      <!-- <LoadingScreen v-if="showLoadingScreen" class="loading-screen" /> -->
    </v-main>

    <BottomNavigation v-if="navigation" />
    <AdditionnalSnackbar />
    <GlobalSnackbar />
  </div>
</template>

<script setup>
import { useScrollRestoration } from 'vue-router/experimental';

// Coque commune des layouts `public`, `user` et `admin` (voir layouts/) : seule la navigation (tiroirs, barre du bas) les distingue
defineProps({
  // Tiroirs et barre du bas : pages connectées
  navigation: {
    type: Boolean,
    default: false,
  },
});

// Défilement des pages hors onglets (en haut) : le choix par chemin est dans les options du plugin (router/scrollRestoration.js)
const { scroll } = useScrollRestoration({ manual: true });

const isDev = ref(import.meta.env.DEV);
// const initializationStore = useInitializationStore();

// Références
const navExpanded = ref(true);
const mobileDrawer = ref(false);
const inScreen = ref(false);
// const theme = ref(false);
// const showLoadingScreen = computed(() => initializationStore.isLoading);

// Fonctions
const toggleMobileDrawer = () => {
  mobileDrawer.value = !mobileDrawer.value;
};

const toggleDrawer = () => {
  navExpanded.value = !navExpanded.value;
};

// Fonction utilitaire pour appliquer les marges correctement
// const applyMargins = (el) => {
//   const vMain = el.closest('.v-main');
//   const vMainStyle = vMain ? window.getComputedStyle(vMain) : null;
//   const paddingTop = vMainStyle ? parseFloat(vMainStyle.paddingTop) : 0;
//   const paddingLeft = vMainStyle ? parseFloat(vMainStyle.paddingLeft) : 0;
//   const paddingRight = vMainStyle ? parseFloat(vMainStyle.paddingRight) : 0;
//   const paddingBottom = vMainStyle ? parseFloat(vMainStyle.paddingBottom) : 0;

//   el.style.position = 'absolute';
//   el.style.top = `${paddingTop}px`;
//   el.style.left = `${paddingLeft}px`;
//   el.style.right = `${paddingRight}px`;

//   el.style.width = `calc(100% - ${paddingLeft + paddingRight}px)`;

//   return { paddingTop, paddingLeft, paddingRight, paddingBottom };
// };

// function fixPosition (el) {
//   const rect = el.getBoundingClientRect()

//   // Lock dimensions & position
//   el.style.position = 'fixed'
//   el.style.top = rect.top + 'px'
//   el.style.left = rect.left + 'px'
//   el.style.width = rect.width + 'px'
//   el.style.height = rect.height + 'px'
//   el.style.margin = '0' // évite que le margin disparaisse
// }

// function resetPosition (el) {
//   el.removeAttribute('style') // nettoyage complet
// }

// const beforeEnter = (el) => {
//   // Important: utiliser setProperty pour "!important"

//   el.style.position = 'fixed'

//   // récupérer la variable layout-left
//   const vLayoutLeftVar = getComputedStyle(document.querySelector('.v-main'))
//     .getPropertyValue('--v-layout-left')

//   el.style.width = `calc(100% - ${vLayoutLeftVar})`
//   el.style.left = '100%'
//   el.style.transition = 'left .5s ease-out, opacity .5s ease-out'
// }

// const onEnter = (el, done) => {

//   const vLayoutLeftVar = getComputedStyle(document.querySelector('.v-main'))
//     .getPropertyValue('--v-layout-left')

//   // slide depuis la droite jusqu’à la position finale
//   el.style.left = vLayoutLeftVar.trim()

//   setTimeout(done, 500) // même durée que la transition
// }

// const onAfterEnter = (el) => {
//   resetPosition(el) // repasse en flow normal
// }

// const beforeLeave = (el) => {

//   fixPosition(el)
// }

// const onLeave = (el, done) => {

//   el.style.transition = 'left .5s ease-out, opacity .5s ease-out'
//   el.style.left = '-40%'

//   setTimeout(done, 500) // aligné avec la durée CSS
// }

// const onAfterLeave = (el) => {
//   resetPosition(el)
// }
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
  overflow: visible !important;
  position: relative !important;
  width: 100% !important;
  padding-top: calc(var(--safe-area-top) + var(--v-layout-top)) !important;
  /* height: calc(100vh - var(--safe-area-top)) !important; */
  /* inherits width from parent */
  box-sizing: border-box;
}

/* Maintenir la hauteur du v-main quand les enfants sont en position absolute */

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
  transition: transform 0.4s ease-out;
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
  transition: all .1s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.loading-screen {
  position: relative;

  top: 0;
  left: 0;
  max-width: 100% !important;
  width: 100% !important;
  height: 100% !important;
  background-color: rgb(var(--v-theme-background));
}

.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: rgba(var(--v-theme-background), 1) !important;
}


</style>
