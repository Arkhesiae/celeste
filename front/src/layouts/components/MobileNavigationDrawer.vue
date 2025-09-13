<template>
  <v-slide-y-reverse-transition>
  <div v-if="modelValue && smAndDown" 
    class="d-flex"
    @update:model-value="$emit('update:modelValue', $event)" 
    close-on-content-click 
    style ="margin-top: calc(64px + var(--safe-area-top)); height: calc(100vh - 64px - var(--safe-area-top) - var(--safe-area-bottom)); width: 100%; z-index: 4000 !important; position: fixed; top: 0; left: 0;"
    >
    <!-- Parent Container -->
    <v-card class="pa-0 px-6 d-flex flex-column align-center flex-0-0 rounded-0" tile color="background" flat
      style="width: 100%; height: 100%; overflow-y: auto;">
      <!-- User Avatar Section -->
      <v-scale-transition appear>

        <v-card max-width="400px"  color="surfaceContainer" flat
          class="flex-0-0 my-16 pa-4 d-flex justify-space-between rounded-xl" width="100%"
          @click="handleClick('/profile/' + authStore.userData.userId)" v-if="isLoggedIn">

          <div class="d-flex justify-space-between align-center ga-2 pl-2">
          
            <v-avatar size="36" color="primary" >
              <img width="36" height="36" v-if="authStore.userData?.avatar" :src="`${API_URL}${authStore.userData?.avatar}`" alt="avatar" />
              <v-icon v-else>mdi-account</v-icon>
            </v-avatar>
       
    
          <div class="d-flex flex-column ">
            <div style="font-size: 16px !important; position: relative; top: 2px;"> {{ getUserInfo?.name?.charAt(0).toUpperCase() + getUserInfo?.name?.slice(1) }} </div>
            <div style="font-size: 16px !important; position: relative; top: -2px;"> <b>{{ getUserInfo?.lastName?.toUpperCase() }}</b></div>
          </div>
        </div>
          <div class="d-flex justify-space-between flex-column align-center">
            <div v-if="points > 99999" class="text-center text-h6 ">
                <v-icon class="mb-1" size="large">mdi-infinity</v-icon>
            </div>
            <div v-else :key="points" class="text-h5 font-weight-bold text-center"> 
              {{ points }}
            </div>
            <div class="text-body-2 text-medium-emphasis mt-n3">Points </div>

          </div>
        </v-card>
     
      </v-scale-transition>

      <!-- Navigation Links Section -->
      <v-card class="d-flex flex-column flex-0-0" color="transparent" elevation="0" tile flat
        style="width: 100%; max-width: 400px;">
        <div v-if="isLoggedIn" class="text-h7 d-flex flex-column">
          <v-fade-transition group appear>
            <div v-for="(item, index) in menuItemsLogged" :key="item.key" class="d-flex flex-column">
              <span style="font-size: 14px !important" class="pt-4 pb-4 cursor-pointer font-weight-medium" @click="handleClick(item.path)" :title="item.title">
                {{ item.label }}
              </span>
              <v-divider v-if="index < menuItemsLogged.length - 1" style="opacity: 0.04;"></v-divider>
            </div>
            <v-divider v-if="authStore.userData.isAdmin" style="opacity: 0.04;"></v-divider>
            <div v-for="(item, index) in menuItemsLoggedAdmin" v-if="authStore.userData.isAdmin" :key="item.key" class="d-flex flex-column">
            
              <span style="font-size: 14px !important" class="pt-4 pb-4 cursor-pointer font-weight-medium" @click="handleClick(item.path)" :title="item.title">
                {{ item.label }}
              </span>
              <v-divider v-if="index < menuItemsLoggedAdmin.length - 1" style="opacity: 0.04;"></v-divider>
            </div>
          </v-fade-transition>

          <v-btn @click="handleLogout" style="height: 48px; border-radius: 16px !important;" color="surfaceContainerHigh"
            variant="flat" class="mt-3 text-error font-weight-bold ">Se déconnecter
          </v-btn>
        </div>

        <div v-else class="text-h7 d-flex flex-column">
          <v-btn v-if="!isLoggedIn" class="my-8" variant="flat" rounded="lg" color="onBackground"
            append-icon="mdi-arrow-right" @click="handleClick('/login')" width="100%"
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
          <span @click="handleClick('/contact-admin')" style="cursor: pointer">Assistance</span>
          <v-divider vertical></v-divider>
          <span @click="handleClick('/patchnotes')" style="cursor: pointer">Patchnotes</span>
          <v-divider vertical></v-divider>
          <span @click="handleClick('/financement')" style="cursor: pointer">Financement</span>
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
       <!-- <span>{{ API_URL }}</span> -->
      <!-- <span>safeAreaTop: {{ safeAreaTop }}</span>
      <span>safeAreaBottom: {{ safeAreaBottom }}</span>
      <span>safeAreaLeft: {{ safeAreaLeft }}</span>
      <span>safeAreaRight: {{ safeAreaRight }}</span> -->
    </v-card>
  
  </div>
  </v-slide-y-reverse-transition>
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
const isAdmin = computed(() => authStore.userData.isAdmin);
const username = computed(() => authStore.userData.name);
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


const safeAreaTop = computed(() => {
  return window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top');
});

const safeAreaBottom = computed(() => {
  return window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom');
});

const safeAreaLeft = computed(() => {
  return window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-left');
});

const safeAreaRight = computed(() => {
  return window.getComputedStyle(document.documentElement).getPropertyValue('--safe-area-right');
}); 

const emit = defineEmits(['update:modelValue', 'update:theme']);

const menuItemsLogged = [
  { key: 'remplacements', label: 'Demandes', path: '/exchange/replace', title: 'Remplacements' },
  { key: 'calendar', label: 'Calendrier', path: '/calendar', title: 'Calendrier' },
  { key: 'rotation', label: 'Tour de service', path: '/rotation', title: 'Tour de service' },
  { key: 'centres', label: authStore.userData.adminType === 'master' ? 'Centres' : 'Mon centre', path: authStore.userData.adminType === 'master' ? '/center/centers' : '/center/' + authStore.userData.centerId + '/teams', title: authStore.userData.adminType === 'master' ? 'Centres' : 'Mon centre' },
  // { key: 'patchnotes', label: 'Patch Notes', path: '/patchnotes', title: 'Patch Notes' },
  // { key: 'financement', label: 'Financement', path: '/financement', title: 'Financement' },
  // { key: 'users', label: 'Utilisateurs', path: '/users', title: 'Utilisateurs' },
  // { key: 'pending-users', label: 'Candidatures', path: '/admin/pending-users', title: 'Candidatures en attente' }
];

const menuItemsLoggedAdmin = [
  { key: 'users', label: 'Utilisateurs', path: '/users', title: 'Utilisateurs' },
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
  const userInfo = userStore.users.find(user => user._id === authStore.userData.userId);
  return userInfo;
});

const handleClick = (path) => {
  router.push({ path: path });
  emit('update:modelValue', false);
}


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