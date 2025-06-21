<template>
    <div class="transition-wrapper d-flex">
        

        <AppBar :showButtons="inScreen" @toggle-mobile-drawer="toggleMobileDrawer" @toggle-drawer="toggleDrawer"></AppBar>

        <DesktopNavigationDrawer v-model:navExpanded="navExpanded" />

        <MobileNavigationDrawer v-model:modelValue="mobileDrawer" />

        <LoginButtons v-if="isDev" />
 
        <v-fade-transition mode="out-in">
            <LoadingScreen v-if="showLoadingScreen" class="loading-screen"/>
   

        <v-main v-else>
            <router-view v-slot="{ Component, route }">
                <transition :name="route.meta.transition || 'fade'" mode="out-in">
                    <component :is="Component" />
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

</script>

<style scoped>
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
