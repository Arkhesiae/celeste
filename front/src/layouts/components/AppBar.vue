<template>
  <v-app-bar class="user-safe-area" style="z-index: 2300 !important;"  scroll-behavior="elevate" color="background">
    <!-- Bouton navigation pour écran large -->
    <template v-slot:prepend>
      <template v-if="!smAndDown && isLoggedIn">
        <v-app-bar-nav-icon @click="toggleDrawer" />
      </template>
    </template>

    <!-- Titre de l'application -->
    <AppBarTitle 
      :is-homepage="isHomepage" 
      :is-dashboard="isDashboard" 
      @title-click="handleTitleClick" 
    />

    <template v-slot:append>
      <!-- Boutons de notifications -->
      <v-tooltip location="bottom" text="Notifications" v-if="false">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" v-if="isLoggedIn" icon @click="toggleNotifications" class="mr-2">
            <v-badge color="tertiary"  :content="'COMMING SOON'" :model-value="'COMMING SOON'">
              <v-icon icon="mdi-bell-outline"></v-icon>
            </v-badge>
         
          </v-btn>
        </template>
      </v-tooltip>
      
      <!-- Layout mobile -->
      <template v-if="smAndDown">
        <ThemeSwitch v-model="isDarkTheme" class="mr-2" />
        <v-app-bar-nav-icon @click="toggleMobileDrawer" :icon="isMobileDrawerOpen ? 'mdi-close' : 'mdi-menu'" />
      </template>

      <!-- Layout desktop -->
      <template v-else>
        <template v-if="isLoggedIn">
          <ThemeSwitch v-model="isDarkTheme" class="mr-2" />
          <AdminSection 
            :is-admin="isAdmin" 
            :admin-type="authStore.adminType"
            :message-count="ticketStore.tickets.length"
            @navigate-rules="router.push({path:'/admin/rules'})"
            @navigate-tickets="router.push({ path : '/tickets' })"
            @navigate-email="router.push({ path : '/emails' })"
          />
        </template>

        <!-- Navigation accueil -->
        <template v-else>
          <HomeNavigation 
            :show-buttons="showButtons"
            :is-dark-theme="isDarkTheme"
            @update-theme="isDarkTheme = $event"
            @navigate-contact="navigateToContact"
            @navigate-get-started="router.push({ path: '/get-started' })"
            @navigate-login="router.push({ path: '/login' })"
            @open-icnagenda="openIcnagenda"
            @open-olafatco="openOlafatco"
          />
        </template>

        <v-spacer />

        <!-- Menu utilisateur -->
        <UserMenu 
          v-if="isLoggedIn"
          :username="username"
          :email="authStore.email"
          :avatar="authStore.avatar"
          :points="points"
          :current-team="currentTeam"
          @navigate-profile="navigateToProfile"
          @navigate-parameter="navigateToParameter"
          @logout="handleLogout"
          @navigate-contact="navigateToContact"
        />
      </template>
    </template>
  </v-app-bar>

  <NotificationsDialog 
    v-model:isDialogOpen="isDialogOpen" 
    v-if="isLoggedIn" 
    :user-id="authStore.userId"
    :notifications="notificationStore.notifications" 
    @markAsRead="handleMarkAsRead"
    @clearNotifications="handleClearNotifications" 
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useTheme } from 'vuetify';

// Stores
import { useAuthStore } from "@/stores/authStore.js";
import { useTeamStore } from "@/stores/teamStore.js";
import { usePointStore } from '@/stores/pointStore.js';
import { useNotificationStore } from '../../stores/notificationStore';
import { useTicketStore } from '../../stores/ticketStore';

// Components
import NotificationsDialog from "@/components/NotificationsDialog.vue";
import AppBarTitle from './AppBar/AppBarTitle.vue';
import ThemeSwitch from './AppBar/ThemeSwitch.vue';
import AdminSection from './AppBar/AdminSection.vue';
import HomeNavigation from './AppBar/HomeNavigation.vue';
import UserMenu from './AppBar/UserMenu.vue';

// Constants
const HOME_PATH = "/landing";
const PARAMETER_PATH = "/parameter";

// Props
const props = defineProps({
  showButtons: {
    type: Boolean,
    default: false,
  },
  isMobileDrawerOpen: {
    type: Boolean,
    default: false,
  },
});

// Emits
const emit = defineEmits(["toggle-mobile-drawer", "toggle-drawer"]);

// Composables
const { smAndDown } = useDisplay();
const theme = useTheme();
const router = useRouter();
const route = useRoute();

// Stores
const authStore = useAuthStore();
const teamStore = useTeamStore();
const pointStore = usePointStore();
const notificationStore = useNotificationStore();
const ticketStore = useTicketStore();

// State
const isDialogOpen = ref(false);
const notificationInterval = ref(null);

// Computed properties
const isLoggedIn = computed(() => authStore.isLoggedIn);
const isAdmin = computed(() => authStore.isAdmin);
const isHomepage = computed(() => route.name === "/landing");
const isDashboard = computed(() => route.name === "/dashboard");
const username = computed(() => authStore.name);
const currentTeam = computed(() => teamStore.currentTeam);
const points = computed(() => pointStore.points);

// Theme synchronization
const isDarkTheme = computed({
  get: () => theme.global.current.value.dark,
  set: (value) => {
    authStore.updateUserPreferences({ theme: value });
    theme.global.name.value = value ? 'darkTheme' : 'lightTheme';
  }
});

// Methods
const handleTitleClick = () => {
  router.push({ path: HOME_PATH });
};

const toggleNotifications = (event) => {
  isDialogOpen.value = !isDialogOpen.value;
};

const toggleMobileDrawer = () => {
  emit("toggle-mobile-drawer");
};

const toggleDrawer = () => {
  emit('toggle-drawer');
};

const navigateToProfile = () => {
  router.push({ path: `/profile/${authStore.userId}` });
};

const navigateToParameter = () => {
  router.push({ path: PARAMETER_PATH });
};

const navigateToContact = () => {
  router.push({ path: '/contact-admin' });
};

const handleLogout = async () => {
  await authStore.logOut();
  router.push({ path: '/login' });
};

const fetchNotifications = async () => {
  if (authStore.userId) {
    await notificationStore.fetchNotifications(authStore.userId);
  }
};

const handleMarkAsRead = async (id) => {
  await notificationStore.markAsRead(id);
};

const handleClearNotifications = async () => {
  await notificationStore.clearNotifications(authStore.userId);
};

const openIcnagenda = () => {
  window.open('https://icnagenda.FR', '_blank');
};

const openOlafatco = () => {
  window.open('https://olafatco.dsna.aviation-civile.gouv.fr/gerer-la-licence', '_blank');
};

// Lifecycle
onMounted(async () => {
  notificationInterval.value = setInterval(fetchNotifications, 30000);
});

onUnmounted(() => {
  if (notificationInterval.value) {
    clearInterval(notificationInterval.value);
  }
});
</script>

<style scoped>
.user-safe-area {
  padding-top: var(--safe-area-top) !important;
}
/* Styles spécifiques à AppBar si nécessaire */
</style>
