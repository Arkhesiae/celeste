<template>
  <div>
    <AppBar :showButtons="inScreen" @toggle-mobile-drawer="toggleMobileDrawer" @toggle-drawer="toggleDrawer"></AppBar>

    <DesktopNavigationDrawer v-model:navExpanded="navExpanded" />

    <MobileNavigationDrawer v-model:modelValue="mobileDrawer" />

    <div class="position-fixed ma-2" style="bottom: 0; right: 0 ; z-index: 99">
      <v-btn variant="tonal" class="mr-2" icon="mdi-star-four-points" @click="autoLogin('master')">Master</v-btn>
      <v-btn variant="tonal" class="mr-2" icon="mdi-shield-crown-outline" @click="autoLogin('admin')">Local</v-btn>
      <v-btn variant="tonal" class="mr-2" icon="mdi-account-outline" @click="autoLogin('user')"></v-btn>
      <v-btn variant="tonal" icon="mdi-logout" color="error" @click="handleLogout"></v-btn>
    </div>

    <v-main>
      <router-view v-slot="{ Component, route }">
        <transition :name="route.meta.transition || 'fade'" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-main>

    <!-- Snackbar global -->
    <v-snackbar-queue v-model="snackbarStore.messageQueue"  color="onBackground" :timeout="3000" location="top"
      height="64px" rounded="xl">
      <template #text="{item}">
        <div class="d-flex align-center" >
          <v-icon :icon="item.icon" :color="item.iconColor" class="me-2" />
          {{ item.message }}
        </div>
      </template>
    </v-snackbar-queue>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { useAuthStore } from "@/stores/authStore.js";
import { useSnackbarStore } from '@/stores/snackbarStore';
import DesktopNavigationDrawer from './components/DesktopNavigationDrawer.vue';
import MobileNavigationDrawer from './components/MobileNavigationDrawer.vue';
import AppBar from './AppBar.vue';

// Utilisation de stores
const snackbarStore = useSnackbarStore();

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
