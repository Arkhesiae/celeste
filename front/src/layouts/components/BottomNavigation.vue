<template>
  <v-bottom-navigation v-if="smAndDown && isLoggedIn" elevation="0" flat class="bottom-nav" bg-color="background" grow height="64"
    style="z-index: 2000 !important;" shift>
    <v-btn :ripple="false" value="home" icon @click="router.push({ path: '/dashboard' }); hapticsImpact()"
      :class="isActive('/dashboard') ? 'active-item' : 'inactive-item'"
      :active="router.currentRoute.value.path === '/dashboard'">
      <v-icon size="20">{{ isActive('/dashboard') ? 'mdi-home' : 'mdi-home-outline' }}</v-icon>
      <span class="text-body-2 " style="font-weight: 600; font-size: 10px !important; ">Accueil</span>
    </v-btn>
    <v-btn :ripple="false" value="calendar" icon @click="router.push({ path: '/calendar' }); hapticsImpact()"
      :class="isActive('/calendar') ? 'active-item' : 'inactive-item'"
      :active="router.currentRoute.value.path === '/calendar'">
      <v-icon size="20">{{ isActive('/calendar') ? 'mdi-calendar' : 'mdi-calendar-outline' }}</v-icon>
      <span class="text-body-2 " style="font-weight: 600; font-size: 10px !important; ">Calendrier</span>
    </v-btn>
    <v-btn :ripple="false" value="demandes" icon @click="router.push({ path: '/exchange/replace' }); hapticsImpact()"
      :class="isActive('/exchange/replace') ? 'active-item' : 'inactive-item'"
      :active="router.currentRoute.value.path === '/exchange'">
      <v-badge size="x-small" rounded="lg" color="onBackground" class="font-weight-bold text-subtitle-2" offset-x="-12"
        offset-y="6" :content="demandsCount" :model-value="demandsCount !== 0">
        <v-icon size="20">{{ isActive('/exchange/replace') ? 'mdi-account-arrow-left' : 'mdi-account-arrow-left-outline'
        }}</v-icon>
      </v-badge>
      <span class="text-body-2 " style="font-weight: 600; font-size: 10px !important; ">Demandes</span>

    </v-btn>
    <!-- <v-btn :ripple="false" value="notifications" icon @click="toggleNotifications" :active="router.currentRoute.value.path === '/notifications'">
      <v-icon size="large">{{ isActive('/notifications') ? 'mdi-bell' : 'mdi-bell-outline' }}</v-icon>
    </v-btn> -->
    <v-btn :ripple="false" value="profile" active-color="onPrimary" active-class="active-item" icon
      @click="router.push({ path: '/profile/' + authStore.userData.userId }); hapticsImpact()"
      :class="isActive('/profile/' + authStore.userData.userId) ? 'active-item' : 'inactive-item'"
      :active="router.currentRoute.value.path === '/profile/' + authStore.userData.userId">
      <v-badge color="tertiary" :content="NOTIFICATION_COUNT" :model-value="false">
        <div class="d-flex align-center justify-center"
          :class="isActive('/profile/' + authStore.userData.userId) ? 'opacity-100' : 'opacity-50'"
          style="width: 32px; height: 32px; border-radius: 50%; background-color: rgba(var(--v-theme-onBackground), 1); position: relative; top: -3px;">
          <v-avatar size="28" class="" variant="tonal" style="background-color: rgba(var(--v-theme-background), 1);">
            <v-img v-if="authStore.userData.avatar" :src="`${API_URL}${authStore.userData.avatar}`" alt="Avatar" />
            <v-icon v-else>mdi-account</v-icon>
          </v-avatar>
        </div>
      </v-badge>

    </v-btn>
  </v-bottom-navigation>
</template>

<script setup>
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/stores/authStore.js";
import { useRoute, useRouter } from "vue-router";
import { computed } from "vue";
import { useNotificationStore } from '../../stores/notificationStore';
import { API_URL } from '@/config/api';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const hapticsImpact= async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
};


const { smAndDown } = useDisplay();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const substitutionStore = useSubstitutionStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);
const NOTIFICATION_COUNT = computed(() => notificationStore.unreadCount);
const demandsCount = computed(() => substitutionStore.availableSubstitutions.length + substitutionStore.availableSwitches.length + substitutionStore.otherDemands.length);

const isActive = (path) => {
  return router.currentRoute.value.path === path;
};




const toggleNotifications = () => {
  // Émettre un événement pour gérer les notifications
  emit('toggle-notifications');
};

const emit = defineEmits(['toggle-notifications']);
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  height: calc(64px + var(--safe-area-bottom) + env(safe-area-inset-bottom)) !important;
  padding-bottom:   calc(var(--safe-area-bottom) + env(safe-area-inset-bottom)) !important;
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
  color: rgba(var(--v-theme-onBackground), .51) !important;

  background-color: transparent !important;
}
</style>