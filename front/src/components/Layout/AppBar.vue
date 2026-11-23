<template>
  <v-app-bar class="user-safe-area" scroll-behavior="elevate" color="background">
    <!-- Titre de l'application -->
    <AppBarTitle :is-homepage="isHomepage" :is-dashboard="isDashboard" @title-click="handleTitleClick" />

    <template #append>
      <!-- Boutons de notifications -->
      <ThemeSwitch class="mr-2" />

      <template v-if="isLoggedIn && isAdmin">
        <AdminSection
          :is-admin="isAdmin"
          :admin-type="authStore.userData.adminType"
          :message-count="ticketCount"
          @navigate-rules="router.push({ path: '/admin/rules' })"
          @navigate-tickets="router.push({ path: '/admin/tickets' })"
          @navigate-email="router.push({ path: '/admin/emails' })"
        />
      </template>

      <template v-if="smAndDown">
        <v-btn
          value="profile"
          active-color="onPrimary"
          active-class="active-item"
          icon
          color="primary"
          :active="router.currentRoute.value.path === '/profile/' + authStore.userData.userId"
          @click="toggleMobileDrawer"
        >
          <!-- <v-badge color="tertiary" :content="NOTIFICATION_COUNT" :model-value="false"> -->

          <UserAvatar :size="28" :badge="missingPhone" />
          <!-- </v-badge> -->
        </v-btn>
      </template>

      <template v-else>
        <!-- Navigation accueil -->
        <template v-if="!isLoggedIn">
          <HomeNavigation
            :show-buttons="showButtons"
            @navigate-contact="navigateToContact"
            @navigate-get-started="router.push({ path: '/get-started' })"
            @navigate-login="router.push({ path: '/login' })"
            @open-icnagenda="openIcnagenda"
            @open-olafatco="openOlafatco"
          />
        </template>

        <v-spacer />

        <!-- Menu utilisateur -->
        <div v-if="isLoggedIn">
          <v-badge
            :model-value="missingPhone"
            offset-x="10"
            offset-y="10"
            location="bottom left"
            color="error"
            icon="mdi-exclamation-thick"
          >
            <UserMenu
              :username="username"
              :email="authStore.userData.email"
              :avatar="authStore.avatar"
              :points="points"
              :current-team="currentTeam"
              @navigate-profile="navigateToProfile"
              @navigate-parameter="navigateToParameter"
              @logout="handleLogout"
              @navigate-contact="navigateToContact"
            />
          </v-badge>
        </div>
      </template>
    </template>
  </v-app-bar>

  <!-- <NotificationsDialog v-if="isLoggedIn" v-model:is-dialog-open="isDialogOpen" :user-id="authStore.userData.userId"
    :notifications="notificationStore.notifications" @mark-as-read="handleMarkAsRead"
    @clear-notifications="handleClearNotifications" /> -->
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDisplay } from 'vuetify';

// Stores
import { useAuthStore } from '@/stores/authStore.js';
import { useTeamStore } from '@/stores/teamStore.js';
import { usePointStore } from '@/stores/pointStore.js';
import { useTicketStore } from '@/stores/ticketStore';

// Constants
const HOME_PATH = '/landing';
const PARAMETER_PATH = '/parameter';

// Props
defineProps({
  showButtons: {
    type: Boolean,
    default: false,
  },
  isMobileDrawerOpen: {
    type: Boolean,
    default: false,
  },
});

const ticketCount = computed(
  () => ticketStore.tickets.filter((ticket) => ticket.status !== 'done' && ticket.status !== 'closed').length,
);

const missingPhone = computed(() => !authStore.userData?.phone);

// Emits
const emit = defineEmits(['toggle-mobile-drawer', 'toggle-drawer']);

// Composables
const { smAndDown } = useDisplay();
const router = useRouter();
const route = useRoute();

// Stores
const authStore = useAuthStore();
const teamStore = useTeamStore();
const pointStore = usePointStore();
const ticketStore = useTicketStore();

// Computed properties
const isLoggedIn = computed(() => authStore.isLoggedIn);
const isAdmin = computed(() => authStore.userData.isAdmin);
const isHomepage = computed(() => route.name === '/landing');
const isDashboard = computed(() => route.name === '/dashboard');
const username = computed(() => authStore.userData.name);
const currentTeam = computed(() => teamStore.currentTeam);
const points = computed(() => pointStore.points);

// Methods
const handleTitleClick = () => {
  router.push({ path: HOME_PATH });
};

const toggleMobileDrawer = () => {
  emit('toggle-mobile-drawer');
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

const openIcnagenda = () => {
  window.open('https://icnagenda.FR', '_blank');
};

const openOlafatco = () => {
  window.open('https://olafatco.dsna.aviation-civile.gouv.fr/gerer-la-licence', '_blank');
};
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
