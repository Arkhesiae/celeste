<template>
  <v-dialog
    z-index="1900"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    scrollable
    transition="scroll-y-transition"
    fullscreen
    close-on-content-click
    scrim="rgba(0,0,0,1)"
    v-if="smAndDown"
  >
    <!-- Parent Container -->
    <v-card
      class="pt-16 pa-8 d-flex flex-column align-center flex-0-0"
      tile
      color="background"
      flat
      style="width: 100%; height: 100vh; overflow-y: auto;"
    >
      <!-- User Avatar Section -->
      <v-scale-transition appear>
        <v-card class="my-12 d-flex justify-center align-center flex-column flex-0-0" color="transparent" rounded="lg"
                elevation="0" tile flat v-if="isLoggedIn" @click="router.push({path: '/profile/' + authStore.userId})">
          <v-avatar size="x-large" color="primary" variant="tonal">{{ usernameInitial }}</v-avatar>
          <v-card-title>{{ username }}</v-card-title>
        </v-card>
      </v-scale-transition>

      <!-- Navigation Links Section -->
      <v-card
        class="d-flex flex-column pb-8 flex-0-0"
        color="transparent"
        elevation="0"
        tile
        flat
        style="width: 100%; max-width: 400px;"
      >
        <div v-if="isLoggedIn" class="text-h7 d-flex flex-column">
          <v-fade-transition group appear>
            <div v-for="(item, index) in menuItemsLogged" :key="item.key" class="d-flex flex-column">
              <span class="pt-4 pb-4 cursor-pointer" @click="router.push({ path: item.path })" :title="item.title">
                {{ item.label }}
              </span>
              <v-divider v-if="index<menuItemsLogged.length-1"></v-divider>
            </div>
          </v-fade-transition>

          <v-btn @click="handleLogout" style="height: 48px; border-radius: 16px !important;"
                 color="error" variant="tonal" class="mt-3">Se déconnecter
          </v-btn>
        </div>

        <div v-else class="text-h7 d-flex flex-column">
          <v-btn v-if="!isLoggedIn" class="my-8" variant="flat" rounded="lg" color="onBackground"
                 append-icon="mdi-arrow-right"
                 @click="router.push({ path: '/login' })" width="100%"
                 style="height: 48px; border-radius: 16px !important;">Se connecter
          </v-btn>

          <v-fade-transition group appear>
            <div v-for="(item, index) in menuItems" :key="item.key" class="d-flex flex-column">
              <span class="pt-4 pb-4" @click="router.push({ path: item.path })" :title="item.title">
                {{ item.label }}
              </span>
              <v-divider v-if="index<menuItems.length-1"></v-divider>
            </div>
          </v-fade-transition>
        </div>

        <!-- Appearance Section -->
        <v-card class="d-flex px-4 mt-8 text-medium-emphasis text-body-2 justify-space-between align-center flex-0-0"
                max-width="400px" flat @click="$event.stopPropagation() ; $emit('update:theme', !theme)">
          <span>Apparence</span>
          <v-switch
            v-model="theme"
            inset
            hide-details
            hide-spin-buttons
            false-icon="mdi-weather-night"
            true-icon="mdi-weather-sunny"
          ></v-switch>
        </v-card>

        <!-- Footer Links Section -->
        <v-list v-if="isLoggedIn" nav class="d-flex justify-space-around align-center pt-8 text-caption"
                bg-color="background">
          <span @click="" style="cursor: pointer">Assistance</span>
          <v-divider vertical></v-divider>
          <span @click="" style="cursor: pointer">Nouveautés</span>
          <v-divider vertical></v-divider>
          <span @click="" style="cursor: pointer">A propos</span>
        </v-list>

        <!-- Footer Links Section -->
        <v-list v-if="!isLoggedIn" nav class="d-flex justify-space-around align-center pt-8 text-caption"
                bg-color="background">
          <div class="d-flex" style="cursor: pointer">
            <span @click="">Icnagenda</span>
            <v-icon class="text-medium-emphasis ml-3">mdi-open-in-new</v-icon>
          </div>
          <v-divider vertical></v-divider>
          <div class="d-flex" style="cursor: pointer">
            <span @click="">Olafatco</span>
            <v-icon class="text-medium-emphasis ml-3">mdi-open-in-new</v-icon>
          </div>
        </v-list>
      </v-card>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/stores/authStore.js";
import { computed, ref } from 'vue';

const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);
const isAdmin = computed(() => authStore.isAdmin);
const username = computed(() => authStore.name);
const usernameInitial = computed(() => username.value ? username.value.charAt(0).toUpperCase() : '');
const theme = ref(false);

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

defineEmits(['update:modelValue', 'update:theme']);

const menuItemsLogged = [
  { key: 'permutations', label: 'Permutations', path: '/exchange/switch', title: 'Permutations' },
  { key: 'remplacements', label: 'Remplacement', path: '/exchange/replace', title: 'Remplacements' },
  { key: 'calendar', label: 'Calendrier', path: '/calendar', title: 'Calendrier' },
  { key: 'rotation', label: 'Tour de service', path: '/rotation', title: 'Tour de service' },
  { key: 'centres', label: 'Mon centre', path: '/center/centers', title: 'Centres' },
  { key: 'users', label: 'Utilisateurs', path: '/users', title: 'Utilisateurs' }
];

const menuItems = [
  { key: 'about', label: 'A propos', path: '/about', title: 'A propos' },
  { key: 'news', label: 'Nouveautés', path: '/news', title: 'Nouveautés' },
  { key: 'assistance', label: 'Assistance', path: '/assistance', title: 'Assistance' }
];

const handleLogout = async () => {
  await authStore.logOut();
  await router.push({ path: "/login", replace: true });
};
</script>

<style scoped>
:deep(.v-switch__track) {
  height: 24px !important;
  border: 1px solid rgba(173, 154, 154, 0.21);
  min-width: 44px !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

:deep(.v-switch__thumb) {
  height: 20px !important;
  width: 20px !important;
}
</style> 