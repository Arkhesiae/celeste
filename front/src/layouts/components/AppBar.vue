<template>
  <v-app-bar class="user-safe-area" scroll-behavior="elevate" color="background">
    <!-- Bouton navigation pour écran large -->
    <template v-slot:prepend>
      <template v-if="!smAndDown && isLoggedIn">
        <v-app-bar-nav-icon @click="toggleDrawer" />
      </template>
    </template>

    <!-- Titre de l'application -->
    <AppBarTitle :is-homepage="isHomepage" :is-dashboard="isDashboard" @title-click="handleTitleClick" />

    <template v-slot:append>
      <!-- Boutons de notifications -->
      <v-tooltip location="bottom" text="Notifications" v-if="false">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" v-if="isLoggedIn" icon @click="toggleNotifications" class="mr-2">
            <v-badge color="tertiary" :content="'COMMING SOON'" :model-value="'COMMING SOON'">
              <v-icon icon="mdi-bell-outline"></v-icon>
            </v-badge>

          </v-btn>
        </template>
      </v-tooltip>


      <ThemeSwitch v-model="isDarkTheme" class="mr-2" />




      <template v-if="isLoggedIn && isAdmin">
        <AdminSection :is-admin="isAdmin" :admin-type="authStore.userData.adminType"
          :message-count="ticketCount" @navigate-rules="router.push({ path: '/admin/rules' })"
          @navigate-tickets="router.push({ path: '/admin/tickets' })"
          @navigate-email="router.push({ path: '/admin/emails' })" />
      </template>
   
      <template v-if="smAndDown">
        <v-app-bar-nav-icon @click="toggleMobileDrawer" :icon="isMobileDrawerOpen ? 'mdi-close' : 'mdi-menu'" />
      </template>

      <template v-else>
        <!-- Navigation accueil -->
        <template v-if="!isLoggedIn">
          <HomeNavigation :show-buttons="showButtons" :is-dark-theme="isDarkTheme" @update-theme="isDarkTheme = $event"
            @navigate-contact="navigateToContact" @navigate-get-started="router.push({ path: '/get-started' })"
            @navigate-login="router.push({ path: '/login' })" @open-icnagenda="openIcnagenda"
            @open-olafatco="openOlafatco" />
        </template>

        <v-spacer />

        <!-- Menu utilisateur -->
         <div>
          <v-badge
            :model-value="!authStore.userData?.phone"
            location="bottom left"
            color="red"
            icon="mdi-exclamation-thick"
          >
        <UserMenu v-if="isLoggedIn" :username="username" :email="authStore.userData.email" :avatar="authStore.avatar"
          :points="points" :current-team="currentTeam" @navigate-profile="navigateToProfile"
          @navigate-parameter="navigateToParameter" @logout="handleLogout" @navigate-contact="navigateToContact" />
          </v-badge>
         </div>
      </template>
    </template>
  </v-app-bar>

  <NotificationsDialog v-model:isDialogOpen="isDialogOpen" v-if="isLoggedIn" :user-id="authStore.userData.userId"
    :notifications="notificationStore.notifications" @markAsRead="handleMarkAsRead"
    @clearNotifications="handleClearNotifications" />
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
import NotificationsDialog from "@/components/Unused/NotificationsDialog.vue";
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

const ticketCount = computed(() => ticketStore.tickets.filter(ticket => ticket.status !== 'done' && ticket.status !== 'closed').length);

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
const isAdmin = computed(() => authStore.userData.isAdmin);
const isHomepage = computed(() => route.name === "/landing");
const isDashboard = computed(() => route.name === "/dashboard");
const username = computed(() => authStore.userData.name);
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

const navigateToAdminPanel = () => {
  router.push({ path: '/admin/admin-panel' });
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
  router.push({ path: `/profile/${authStore.userData.userId}` });
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
  if (authStore.userData.userId) {
    await notificationStore.fetchNotifications(authStore.userData.userId);
  }
};

const handleMarkAsRead = async (id) => {
  await notificationStore.markAsRead(id);
};

const handleClearNotifications = async () => {
  await notificationStore.clearNotifications(authStore.userData.userId);
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

<style>
/* .v-app {
  box-sizing: border-box !important;
  border: 1px solid red !important;
}

.v-app-bar {
  opacity: 0.5 !important;
  border: 1px solid green !important;
}

.v-main {
  box-sizing: border-box !important;
  border: 1px solid blue !important;
} */

.user-safe-area {
  padding-top: var(--safe-area-top) !important;
}

/* Styles spécifiques à AppBar si nécessaire */
</style>