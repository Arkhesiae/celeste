<template>
  <v-bottom-navigation v-if="smAndDown && isLoggedIn" class="bottom-nav" bg-color="onBackground" grow height="80"
   style="z-index: 2000 !important;" shift>
    <v-btn :ripple="false" value="home" icon @click="router.push({ path: '/dashboard' })" :active="router.currentRoute.value.path === '/dashboard'">
      <v-icon size="large">{{ isActive('/dashboard') ? 'mdi-home' : 'mdi-home-outline' }}</v-icon>
    </v-btn>
    <v-btn :ripple="false" value="calendar" icon @click="router.push({ path: '/calendar' })" :active="router.currentRoute.value.path === '/calendar'">
      <v-icon size="large">{{ isActive('/calendar') ? 'mdi-calendar' : 'mdi-calendar-outline' }}</v-icon>
    </v-btn>
    <v-btn :ripple="false" value="notifications" icon @click="toggleNotifications" :active="router.currentRoute.value.path === '/notifications'">
      <v-icon size="large">{{ isActive('/notifications') ? 'mdi-bell' : 'mdi-bell-outline' }}</v-icon>
    </v-btn>
    <v-btn :ripple="false" value="profile" active-color="onPrimary" active-class="active-item" icon @click="router.push({ path: '/profile/' + authStore.userId })" :active="router.currentRoute.value.path === '/profile/' + authStore.userId">
      <v-badge color="tertiary" :content="NOTIFICATION_COUNT" :model-value="NOTIFICATION_COUNT !== 0">
        <v-avatar size="28" class="" variant="tonal">
          <v-img v-if="authStore.avatar" :src="`${API_URL}${authStore.avatar}`" alt="Avatar" />
          <v-icon v-else>mdi-account</v-icon>
        </v-avatar>
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

const { smAndDown } = useDisplay();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();

const isLoggedIn = computed(() => authStore.isLoggedIn);
const NOTIFICATION_COUNT = computed(() => notificationStore.unreadCount);

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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border-radius: 24px 24px 0 0;
}

:deep(.v-btn--active) {
  color: rgba(var(--v-theme-onPrimary), 1) !important;
  background-color: transparent !important;
  font-size: 1rem;
}

:deep(.v-btn__overlay) {
  color: rgba(var(--v-theme-onPrimary), 1) !important;
  background-color: transparent !important;
  font-size: 1rem;
}

.active-item {
  color: rgba(var(--v-theme-primary), 1) !important;
  background-color: transparent !important;
}
</style> 