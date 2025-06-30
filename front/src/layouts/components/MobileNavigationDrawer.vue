<template>
  <v-dialog z-index="1900" style="z-index: 2000 !important;" :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)" scrollable transition="scroll-y-transition" fullscreen
    close-on-content-click scrim="rgba(0,0,0,1)" v-if="smAndDown">
    <!-- Parent Container -->
    <v-card class="pt-16 pa-8 d-flex flex-column align-center flex-0-0 pb-8" tile color="background" flat
      style="width: 100%; height: 100vh; overflow-y: auto; z-index: 25000 !important;">
      <!-- User Avatar Section -->
      <v-scale-transition appear>

        <v-card max-width="400px" style="border-radius: 16px !important;" color="surfaceContainerHigh" flat
          class="my-16 pa-4 d-flex justify-space-between" width="100%"
          @click="router.push({ path: '/profile/' + authStore.userId })" v-if="isLoggedIn">

          <div class="d-flex justify-space-between align-center ga-2">
            <v-avatar size="large" color="primary" variant="tonal">
              <img v-if="getUserInfo?.avatar" :src="`${API_URL}${getUserInfo?.avatar}`" alt="avatar" />
              <v-icon v-else>mdi-account</v-icon>
            </v-avatar>
       
   
          <div class="d-flex flex-column">
            <div class="text-h7"> {{ getUserInfo?.name?.charAt(0).toUpperCase() + getUserInfo?.name?.slice(1) }} </div>
            <div class="text-h7"> <b>{{ getUserInfo?.lastName?.toUpperCase() }}</b></div>
          </div>
        </div>
          <div class="d-flex justify-space-between flex-column align-center">
            <div class="text-h5 font-weight-bold"> {{ points }}</div>
            <div class="text-body-2 text-medium-emphasis mt-n3">Points </div>

          </div>
        </v-card>
        <v-card class="my-12 d-flex justify-center align-center flex-column flex-0-0" color="transparent" rounded="lg"
          elevation="0" tile flat v-if="isLoggedIn" @click="router.push({ path: '/profile/' + authStore.userId })">
          <v-avatar size="x-large" color="primary" variant="tonal">{{ usernameInitial }}</v-avatar>
          <v-card-title>{{ username }}</v-card-title>
        </v-card>
      </v-scale-transition>

      <!-- Navigation Links Section -->
      <v-card class="d-flex flex-column pb-8 flex-0-0" color="transparent" elevation="0" tile flat
        style="width: 100%; max-width: 400px;">
        <div v-if="isLoggedIn" class="text-h7 d-flex flex-column">
          <v-fade-transition group appear>
            <div v-for="(item, index) in menuItemsLogged" :key="item.key" class="d-flex flex-column">
              <span class="pt-4 pb-4 cursor-pointer" @click="router.push({ path: item.path })" :title="item.title">
                {{ item.label }}
              </span>
              <v-divider v-if="index < menuItemsLogged.length - 1"></v-divider>
            </div>
          </v-fade-transition>

          <v-btn @click="handleLogout" style="height: 48px; border-radius: 16px !important;" color="error"
            variant="tonal" class="mt-3">Se déconnecter
          </v-btn>
        </div>

        <div v-else class="text-h7 d-flex flex-column">
          <v-btn v-if="!isLoggedIn" class="my-8" variant="flat" rounded="lg" color="onBackground"
            append-icon="mdi-arrow-right" @click="router.push({ path: '/login' })" width="100%"
            style="height: 48px; border-radius: 16px !important;">Se connecter
          </v-btn>

          <!-- <v-fade-transition group appear>
            <div v-for="(item, index) in menuItems" v-if="isLoggedIn" :key="item.key" class="d-flex flex-column">
              <span class="pt-4 pb-4" @click="router.push({ path: item.path })" :title="item.title">
                {{ item.label }}
              </span>
              <v-divider v-if="index<menuItems.length-1"></v-divider>
            </div>
          </v-fade-transition> -->
        </div>

        <!-- Appearance Section -->
        <!-- <v-card class="d-flex px-4 mt-8 text-medium-emphasis text-body-2 justify-space-between align-center flex-0-0"
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
        </v-card> -->

        <!-- Footer Links Section -->
        <v-list nav class="d-flex justify-space-around align-center pt-8 text-caption" bg-color="background">
          <span @click="router.push({ path: '/contact-admin' })" style="cursor: pointer">Assistance</span>
          <!-- <v-divider vertical></v-divider> -->
          <!-- <span @click="" style="cursor: pointer">Nouveautés</span>
          <v-divider vertical></v-divider>
          <span @click="" style="cursor: pointer">A propos</span> -->
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
import { computed, onMounted, ref } from 'vue';
import { useUserStore } from "@/stores/userStore.js";
import { API_URL } from "@/config/api.js"; 
import { usePointStore } from "@/stores/pointStore.js";

const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const pointStore = usePointStore();
const userStore = useUserStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);
const isAdmin = computed(() => authStore.isAdmin);
const username = computed(() => authStore.name);
const usernameInitial = computed(() => username.value ? username.value.charAt(0).toUpperCase() : '');
const theme = ref(false);
const user = ref(null);
const points = computed(() => pointStore.points);

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
});

defineEmits(['update:modelValue', 'update:theme']);

const menuItemsLogged = [
  { key: 'remplacements', label: 'Demandes', path: '/exchange/replace', title: 'Remplacements' },
  { key: 'calendar', label: 'Calendrier', path: '/calendar', title: 'Calendrier' },
  { key: 'rotation', label: 'Tour de service', path: '/rotation', title: 'Tour de service' },
  { key: 'centres', label: authStore.adminType === 'master' ? 'Centres' : 'Mon centre', path: authStore.adminType === 'master' ? '/center/centers' : '/center/' + authStore.centerId + '/teams', title: authStore.adminType === 'master' ? 'Centres' : 'Mon centre' },
  // { key: 'users', label: 'Utilisateurs', path: '/users', title: 'Utilisateurs' },
  { key: 'pending-users', label: 'Candidatures', path: '/admin/pending-users', title: 'Candidatures en attente' }
];

const menuItems = [
  // { key: 'about', label: 'A propos', path: '/about', title: 'A propos' },
  // { key: 'news', label: 'Nouveautés', path: '/news', title: 'Nouveautés' },
  { key: 'assistance', label: 'Assistance', path: '/assistance', title: 'Assistance' }
];

const handleLogout = async () => {
  await authStore.logOut();
  await router.push({ path: "/login", replace: true });
};

const getUserInfo = computed(() => {
  const userInfo = userStore.users.find(user => user._id === authStore.userId);
  console.log(userInfo);
  return userInfo;
});


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