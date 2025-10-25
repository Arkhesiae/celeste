<template>
  <div class="transition-wrapper d-flex">


    <AppBar :showButtons="inScreen" :isMobileDrawerOpen="mobileDrawer" @toggle-mobile-drawer="toggleMobileDrawer" @toggle-drawer="toggleDrawer"></AppBar>

    <DesktopNavigationDrawer2 v-model:navExpanded="navExpanded" />

    <MobileNavigationDrawer class="user-safe-area" v-model:modelValue="mobileDrawer" />

    <LoginButtons v-if="isDev" />

    <v-fade-transition>
    
    </v-fade-transition>

    <v-fade-transition mode="out-in">



      <v-main  position="relative" >
        <LoadingScreen v-if="showLoadingScreen" class="loading-screen" />
        
          <router-view  v-else v-slot="{ Component, route }">
          <!-- <transition name="fade" mode="out-in"> -->
            <transition 
            @before-enter="beforeEnter"
            @before-leave="beforeLeave"
            @enter="onEnter"
            @leave="onLeave"
            @after-enter="onAfterEnter"
            @after-leave="onAfterLeave"

            
            >
            <div class="wrapper" :key="route.path" >
                <component :is="Component"  />
            </div>
          </transition>
        </router-view>
       
    

      </v-main>
    </v-fade-transition>
    <BottomNavigation />
    <AdditionnalSnackbar /> 
    <GlobalSnackbar />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useInitializationStore } from '@/stores/initializationStore';
import AppBar from './components/AppBar.vue';
import DesktopNavigationDrawer2 from './components/DesktopNavigationDrawer2.vue';
import MobileNavigationDrawer from './components/MobileNavigationDrawer.vue';
import LoginButtons from './components/LoginButtons.vue';
import GlobalSnackbar from './components/GlobalSnackbar.vue';
import BottomNavigation from './components/BottomNavigation.vue';
import AdditionnalSnackbar from './components/AdditionnalSnackbar.vue';




const isDev = ref(import.meta.env.DEV);
const initializationStore = useInitializationStore();

// Références
const navExpanded = ref(true);
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

function fixPosition(el) {
  const rect = el.getBoundingClientRect()

  // Lock dimensions & position
  el.style.position = 'fixed'
  el.style.top = rect.top + 'px'
  el.style.left = rect.left + 'px'
  el.style.width = rect.width + 'px'
  el.style.height = rect.height + 'px'
  el.style.margin = '0' // évite que le margin disparaisse
}

function resetPosition(el) {
  el.removeAttribute('style') // nettoyage complet
}

const beforeEnter = (el) => {
  // Important: utiliser setProperty pour "!important"
 
  el.style.position = 'fixed'

  // récupérer la variable layout-left
  const vLayoutLeftVar = getComputedStyle(document.querySelector('.v-main'))
    .getPropertyValue('--v-layout-left')

  el.style.width = `calc(100% - ${vLayoutLeftVar})`
  el.style.left = '100%'
  el.style.transition = 'left .5s ease-out, opacity .5s ease-out'
}

const onEnter = (el, done) => {
 

  const vLayoutLeftVar = getComputedStyle(document.querySelector('.v-main'))
    .getPropertyValue('--v-layout-left')

  // slide depuis la droite jusqu’à la position finale
  el.style.left = vLayoutLeftVar.trim()

  setTimeout(done, 500) // même durée que la transition
}

const onAfterEnter = (el) => {
  resetPosition(el) // repasse en flow normal
}

const beforeLeave = (el) => {
 
  fixPosition(el)
}

const onLeave = (el, done) => {

  el.style.transition = 'left .5s ease-out, opacity .5s ease-out'
  el.style.left = '-40%'

  setTimeout(done, 500) // aligné avec la durée CSS
}

const onAfterLeave = (el) => {
  resetPosition(el)
}


</script>

<style scoped>
.user-safe-area {
  padding-top: env(safe-area-inset-top) !important;
}

.v-container {
  border: 1px solid red;
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
  padding-top: calc(var(--safe-area-top) + var(--v-layout-top)) !important;
  /* height: calc(100vh - var(--safe-area-top)) !important; */
  /* inherits width from parent */
  box-sizing: border-box;
}

/* Maintenir la hauteur du v-main quand les enfants sont en position absolute */
.v-main.transitioning {
  position: fixed !important;
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
  transition: all 0.05s ease-out;
}

.fade-enter-from,
.fade-leave-to {

  opacity: 0;
}

.loading-screen {

  position: relative;

  top: 0;
  left: 0;
  max-width: 100vw !important;
  width: 100% !important;
  height: 100% !important;
  background-color: rgb(var(--v-theme-background));
 
}

.wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: rgba(var(--v-theme-background),1) !important;
  
}

</style>
