<template>
  <!-- Badge d'admin -->
  <div class="d-flex align-center ga-2 mx-2">
    
    <v-badge color="pending" :model-value="messageCount > 0 || pendingUsersCount > 0" offset-x="60" offset-y="30" rounded="lg">
      <template #badge>
        <div class="d-flex align-center ga-3">
          <div v-if="messageCount > 0">
        <v-icon size="x-small" class="mr-1">mdi-account-question-outline</v-icon>
        <span class="text-badge">{{ messageCount }}</span>
        </div>
        <div v-if="pendingUsersCount > 0">
        <v-icon size="x-small" class="mr-1">mdi-account-clock-outline</v-icon>
        <span class="text-badge">{{ pendingUsersCount }}</span>
        </div>
        </div>
      </template>
      <v-chip rounded="lg" size="small" v-if="isAdmin" @click="navigateToAdminPanel" class="cursor-pointer" >
        <v-icon class="mr-2" :color="authStore.userData.adminType === 'master' ? 'primary' : 'secondary'">
        {{ authStore.userData.adminType === 'master' ? 'mdi-star-four-points' : 'mdi-shield-crown-outline' }}
        </v-icon>
        {{ authStore.userData.adminType === 'master' ? 'Master' : 'Admin' }}
    </v-chip>
    </v-badge>
    <div v-if="!smAndDown">
    <!-- Bouton règles pour admin master -->
    <v-btn v-if="isAdmin && adminType === 'master'" icon variant="text" color="onBackground" class="text-body-2"
      @click="$emit('navigate-rules')">
      <v-icon size="small">mdi-server-security</v-icon>
    </v-btn>

    <!-- Lien vers les tickets pour admin master -->
    <v-btn v-if="isAdmin" icon @click="$emit('navigate-tickets')">
      <v-badge rounded="lg" offset-x="10" offset-y="28" :content="messageCount" :model-value="messageCount > 0"
        color="pending">

        <v-icon size="small">mdi-account-question-outline</v-icon>
      </v-badge>
    </v-btn>
    <!-- Lien vers les tickets pour admin master -->
    <v-btn v-if="isAdmin" icon @click="$emit('navigate-email')">

      <v-icon size="small">mdi-email-outline</v-icon>

    </v-btn>
  </div>
  </div>
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

import { useUserStore } from '@/stores/userStore';
const { smAndDown } = useDisplay();
const userStore = useUserStore();
const authStore = useAuthStore();
const router = useRouter();
// Props
defineProps({
  isAdmin: {
    type: Boolean,
    default: false
  },
  adminType: {
    type: String,
    default: ''
  },
  messageCount: {
    type: Number,
    default: 0
  }
});



const pendingUsersCount = computed(() => {
  return userStore.users.filter(user => user.registrationStatus === 'pending').length;
});
// Emits
defineEmits(['navigate-rules', 'navigate-tickets', 'navigate-email']);

const navigateToAdminPanel = () => {
  router.push({ path: '/admin/admin-panel' });
};
</script>
<style scoped>
.text-badge {
  font-size: 0.6rem !important;
  font-weight: 600 !important;

}
</style>