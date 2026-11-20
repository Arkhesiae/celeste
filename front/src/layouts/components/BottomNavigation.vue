<template>
  <v-bottom-navigation
    v-if="smAndDown && isLoggedIn"
    elevation="0"
    flat
    class="bottom-nav"
    bg-color="background"
    grow
    height="64"
    style="z-index: 2000 !important"
    shift
  >
    <v-btn
      :ripple="false"
      value="home"
      icon
      :class="isActive('/dashboard') ? 'active-item' : 'inactive-item'"
      :active="router.currentRoute.value.path === '/dashboard'"
      @click="
        router.push({ path: '/dashboard' });
        hapticsImpact();
      "
    >
      <v-icon size="20">
        {{ isActive('/dashboard') ? 'mdi-home' : 'mdi-home-outline' }}
      </v-icon>
      <span class="text-body-medium" style="font-weight: 600; font-size: 10px !important">Accueil</span>
    </v-btn>
    <v-btn
      :ripple="false"
      value="calendar"
      icon
      :class="isPlanning ? 'active-item' : 'inactive-item'"
      :active="isPlanning"
      @click="
        router.push({ path: '/planning/calendar' });
        hapticsImpact();
      "
    >
      <v-icon size="20">
        {{ isPlanning ? 'mdi-calendar' : 'mdi-calendar-outline' }}
      </v-icon>
      <span class="text-body-medium" style="font-weight: 600; font-size: 10px !important">Planning</span>
    </v-btn>
    <v-btn
      :ripple="false"
      value="demandes"
      icon
      :class="isActive('/demand-page/demands') ? 'active-item' : 'inactive-item'"
      :active="router.currentRoute.value.path === '/demand-page/demands'"
      @click="
        router.push({ path: '/demand-page/demands' });
        hapticsImpact();
      "
    >
      <v-badge
        size="x-small"
        rounded="lg"
        color="onBackground"
        class="font-weight-bold text-title-small"
        offset-x="-12"
        offset-y="6"
        :content="demandsCount"
        :model-value="demandsCount !== 0"
      >
        <v-icon size="20">
          {{ isActive('/demand-page/demands') ? 'mdi-account-arrow-left' : 'mdi-account-arrow-left-outline' }}
        </v-icon>
      </v-badge>
      <span class="text-body-medium" style="font-weight: 600; font-size: 10px !important">Demandes</span>
    </v-btn>
    <v-btn
      :ripple="false"
      value="center"
      icon
      :class="isCenter ? 'active-item' : 'inactive-item'"
      :active="isCenter"
      @click="
        router.push({ path: centerPath });
        hapticsImpact();
      "
    >
      <v-icon size="20">mdi-airport</v-icon>
      <span class="text-body-medium" style="font-weight: 600; font-size: 10px !important">{{ centerLabel }}</span>
    </v-btn>
    <!-- <v-btn :ripple="false" value="notifications" icon @click="toggleNotifications" :active="router.currentRoute.value.path === '/notifications'">
      <v-icon size="large">{{ isActive('/notifications') ? 'mdi-bell' : 'mdi-bell-outline' }}</v-icon>
    </v-btn> -->
  </v-bottom-navigation>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const hapticsImpact = async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
};


const { smAndDown } = useDisplay();
const router = useRouter();
const authStore = useAuthStore();
// const notificationStore = useNotificationStore();
const substitutionStore = useSubstitutionStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);
// const NOTIFICATION_COUNT = computed(() => notificationStore.unreadCount);
const demandsCount = computed(
  () =>
    substitutionStore.availableSubstitutions.length +
    substitutionStore.availableSwitches.length +
    substitutionStore.otherDemands.length,
);

// Calendrier et grille de l'équipe sont deux vues d'un même planning (voir PlanningSwitch.vue)
const isPlanning = computed(() => router.currentRoute.value.path.startsWith('/planning'));

// Le centre de l'utilisateur ; un administrateur principal sans centre choisit d'abord un centre
const centerPath = computed(() =>
  authStore.userData.centerId ? `/center/${authStore.userData.centerId}/teams` : '/center/centers',
);
const centerLabel = computed(() => (authStore.userData.centerId ? 'Mon centre' : 'Centres'));
const isCenter = computed(() => router.currentRoute.value.path.startsWith('/center/'));

const isActive = (path) => {
  return router.currentRoute.value.path === path;
};

// const toggleNotifications = () => {
//   // Émettre un événement pour gérer les notifications
//   emit('toggle-notifications');
// };

defineEmits(['toggle-notifications']);
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  height: calc(64px + var(--safe-area-bottom) + env(safe-area-inset-bottom)) !important;
  padding-bottom: calc(var(--safe-area-bottom) + env(safe-area-inset-bottom)) !important;
  /* box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); */
  /* border-radius: 24px 24px 0 0; */
}

:deep(.v-btn--active) {
  color: rgba(var(--v-theme-onBackground), 1) !important;
  background-color: transparent !important;
  font-size: 1rem;
}

:deep(.v-btn__overlay) {
  color: rgba(var(--v-theme-onBackground), 1) !important;
  background-color: transparent !important;
  font-size: 1rem;
}

.active-item {
  color: rgba(var(--v-theme-brimary), 1) !important;

  background-color: transparent !important;
}

.inactive-item {
  color: rgba(var(--v-theme-onBackground), 0.51) !important;

  background-color: transparent !important;
}
</style>
