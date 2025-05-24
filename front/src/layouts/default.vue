<template>
    <div class="transition-wrapper d-flex">
        <AppBar :showButtons="inScreen" @toggle-mobile-drawer="toggleMobileDrawer" @toggle-drawer="toggleDrawer"></AppBar>

        <DesktopNavigationDrawer v-model:navExpanded="navExpanded" />

        <MobileNavigationDrawer v-model:modelValue="mobileDrawer" />

        <LoginButtons v-if="isDev" />

        <v-main>
            <router-view v-slot="{ Component, route }">
                <transition :name="route.meta.transition || 'fade'" mode="out-in">
                    <component :is="Component" />
                </transition>
            </router-view>
        </v-main>

        <BottomNavigation />

        <GlobalSnackbar />
    </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { useAuthStore } from "@/stores/authStore.js";
import { useSnackbarStore } from '@/stores/snackbarStore';
import DesktopNavigationDrawer from './components/DesktopNavigationDrawer.vue';
import MobileNavigationDrawer from './components/MobileNavigationDrawer.vue';
import AppBar from './components/AppBar.vue';
import LoginButtons from './components/LoginButtons.vue';
import GlobalSnackbar from './components/GlobalSnackbar.vue';
import BottomNavigation from './components/BottomNavigation.vue';
// Utilisation de stores
const snackbarStore = useSnackbarStore();
const isDev = ref(import.meta.env.DEV);
const authStore = useAuthStore();
const router = useRouter();

// Références
const navExpanded = ref(false);
const mobileDrawer = ref(false);
const inScreen = ref(false);
const theme = ref(false);

// Fonctions
const toggleMobileDrawer = () => {
  mobileDrawer.value = !mobileDrawer.value;
};

const toggleDrawer = () => {
  navExpanded.value = !navExpanded.value;
};

const handleUpdateTopbar = (value) => {
  inScreen.value = value;
};

const handleLogout = async () => {
  await authStore.logOut();
  await router.push({ path: "/login", replace: true });
};

const autoLogin = async (role) => {
  try {
    authStore.logOut(); // Déconnexion de l'utilisateur actuel
    if (role === 'admin') {
      await authStore.logIn({
        email: 'localadmin@example.com',
        password: 'adminpassword',
      });
    } else if (role === 'user') {
      await authStore.logIn({
        email: 'user@example.com',
        password: 'userpassword',
      });
    } else if (role === 'master') {
      await authStore.logIn({
        email: 'masteradmin@example.com',
        password: 'adminpassword',
      });
    }
    await router.push({ path: "/dashboard", replace: true });
  } catch (error) {
    console.error(`Échec de la connexion automatique en tant que ${role}:`, error);
  }
};

onMounted(() => {
})


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
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

</style>
