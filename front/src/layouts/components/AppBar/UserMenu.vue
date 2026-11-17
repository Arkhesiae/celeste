<template>
  <v-menu :close-on-content-click="false" location="bottom end" offset="10">
    <template #activator="{ props }">
      <v-tooltip location="bottom" text="Profil">
        <template #activator="{ props: tooltipProps }">
          <v-btn icon color="primary" variant="tonal" class="mr-2" v-bind="{ ...props, ...tooltipProps }">
            <v-avatar size="40" variant="tonal" color="primary">
              <v-img v-if="authStore.userData.avatar" :src="`${API_URL}${authStore.userData.avatar}`" alt="Avatar" />
              <v-icon v-else> mdi-account </v-icon>
            </v-avatar>
          </v-btn>
        </template>
      </v-tooltip>
    </template>

    <!-- Identité, points et équipe -->
    <v-card min-width="300" class="pa-4 mb-1" rounded="xl">
      <v-list>
        <v-list-item>
          <template #prepend>
            <v-avatar size="32" variant="tonal" style="background-color: rgb(var(--v-theme-background))">
              <v-img v-if="authStore.userData.avatar" :src="`${API_URL}${authStore.userData.avatar}`" alt="Avatar" />
              <v-icon v-else> mdi-account </v-icon>
            </v-avatar>
          </template>
          <v-list-item-title class="text-title-large">
            {{ username }}
          </v-list-item-title>
          <v-list-item-subtitle>{{ email }}</v-list-item-subtitle>
        </v-list-item>
      </v-list>

      <v-divider />

      <v-list>
        <v-list-item>
          <div class="d-flex justify-space-between align-center">
            <div class="d-flex align-center pa-2">
              <LogoCopy color="background" style="height: 30px; width: 30px" />
              <div class="d-flex justify-space-between flex-column align-center ml-3">
                <div v-if="points > 99999" class="text-center text-body-large">
                  <v-icon class="mb-1" size="x-large"> mdi-infinity </v-icon>
                </div>
                <v-list-item-title v-else class="text-headline-small font-weight-bold mb-0 pa-0">
                  {{ points }}
                </v-list-item-title>
                <v-list-item-subtitle class="text-body-small font-weight-bold mt-n2 pa-0">
                  Points
                </v-list-item-subtitle>
              </div>
            </div>
            <div class="d-flex align-center">
              <v-icon color="onPrimary" icon="mdi-crowd" />
              <v-list-item-title class="text-body-large font-weight-bold ml-2"> Équipe </v-list-item-title>
              <v-list-item-subtitle class="ml-2">
                {{ currentTeam?.name || 'Non assigné' }}
                {{ currentTeam?.type === 'Renfort' ? '(Renfort)' : '' }}
              </v-list-item-subtitle>
            </div>
          </div>
        </v-list-item>
      </v-list>
    </v-card>

    <!-- Actions -->
    <v-card rounded="xl">
      <!-- Trois liens reliés en un seul groupe -->
      <v-btn-group connected variant="flat" color="primaryContainer" size="small" class="w-100 pa-0">
        <v-btn class="flex-grow-1"  prepend-icon="mdi-account-cog" @click="$emit('navigate-profile')">
          Profil
        </v-btn>
        <v-btn class="flex-grow-1"  prepend-icon="mdi-cog" @click="router.push('/user-params')">
          Paramètres
          <template v-if="!hasPhone" #append>
            <v-badge color="error" icon="mdi-exclamation-thick" inline />
          </template>
        </v-btn>
        <v-btn class="flex-grow-1" prepend-icon="mdi-logout" @click="$emit('logout')">
          Se déconnecter
        </v-btn>
      </v-btn-group>

      <div class="d-flex justify-end">
        <v-btn
          prepend-icon="mdi-information-outline"
          variant="text"
          color="background"
          class="text-body-medium"
          @click="$emit('navigate-contact')"
        >
          Assistance
        </v-btn>
      </div>
    </v-card>
  </v-menu>
</template>

<script setup>
import { API_URL } from '@/config/api';
import { usePointStore } from '@/stores/pointStore';
import { useAuthStore } from '@/stores/authStore.js';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const pointStore = usePointStore();

defineProps({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: null,
  },
  currentTeam: {
    type: Object,
    default: null,
  },
});

defineEmits(['navigate-profile', 'navigate-parameter', 'logout', 'navigate-contact']);

const points = computed(() => pointStore.points);
const hasPhone = computed(() => authStore.userData.phone);
</script>

<style scoped>
:deep(.v-list-item) .v-list-item__overlay {
  background-color: transparent !important;
}
</style>
