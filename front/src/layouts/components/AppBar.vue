<template>
  <v-app-bar style="z-index: 2000 !important;" scroll-behavior="elevate" color="background">
    <!-- Bouton nav pour écran large -->
    <template v-slot:prepend>
      <template v-if="!smAndDown && isLoggedIn">
        <v-app-bar-nav-icon @click="toggleDrawer" />
      </template>

    </template>

    <!-- Titre de l'application -->
    <v-app-bar-title @click="handleTitleClick">
      <v-btn flat color="remplacement" class="text-overline font-weight-bold " :active="isHomepage || isDashboard">
        {{ APP_TITLE }}
      </v-btn>
    </v-app-bar-title>

    <template v-slot:append>
      <!-- Bouton nouveau rempla -->
      <!-- <div v-if="isLoggedIn && !smAndDown">
        <v-btn class="mr-5" prepend-icon="mdi-plus" rounded="lg" color="primary">
          Nouveau switch
        </v-btn>
      </div> -->

      <!-- Boutons de notifications -->
      <v-tooltip location="bottom" text="Notifications" v-if="false">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" v-if="isLoggedIn" icon @click="toggleNotifications" class="mr-2">
            <v-badge color="tertiary"  :content="'COMMING SOON'" :model-value="'COMMING SOON'">
              <v-icon icon="mdi-bell-outline"></v-icon>
            </v-badge>
         
          </v-btn>
        </template>
      </v-tooltip>

      <!-- Layout mobile -->
      <template v-if="smAndDown">
        <v-app-bar-nav-icon @click="toggleMobileDrawer" />
      </template>

      <!-- Layout desktop -->
      <template v-else>
        <template v-if="isLoggedIn">


          <!-- Badge d'admin -->
          <v-chip class="mr-2" rounded="lg" v-if="isAdmin && isLoggedIn"> 
            <v-icon class="mr-2" v-if="authStore.adminType === 'master'" color="primary">mdi-star-four-points</v-icon>
            <v-icon class="mr-2" v-else color="secondary">mdi-shield-crown-outline</v-icon>
            {{ authStore.adminType === 'master' ? 'Master' : 'Admin' }}</v-chip>

          <!-- Lien vers les messages pour admin master -->
          <v-btn
            v-if="isAdmin && authStore.adminType === 'master'"
            icon
            class="mr-2"
            @click="router.push({ path : '/messages' })"
          >
            <v-badge
              :content="messageStore.unreadCount"
              :model-value="messageStore.unreadCount > 0"
              color="error"
            >
              <v-icon>mdi-message-text</v-icon>
            </v-badge>
          </v-btn>
        </template>

        <!--    Navigation accueil    -->
        <template v-else>
          <div class="d-flex justify-center align-center">
            <v-switch v-model="isDarkTheme" inset class="mr-2" hide-details false-icon="mdi-weather-sunny"
              true-icon="mdi-weather-night"></v-switch>
            <v-btn variant="text" class="text-body-2 nav-link" @click="navigateToContact">Assistance</v-btn>
            <!-- <v-btn variant="text" class="text-body-2 nav-link text-capitalize">à propos</v-btn> -->
            <!-- <v-btn variant="text" class="text-body-2 nav-link">Nouveautés</v-btn> -->

            <v-btn variant="text" class="text-body-2 nav-link" @click="openIcnagenda">Icnagenda
              <v-icon class="ml-3 text-medium-emphasis">mdi-open-in-new</v-icon>
            </v-btn>
            <v-btn variant="text" class="text-body-2 nav-link" @click="openOlafatco">Olafatco
              <v-icon class="ml-3 text-medium-emphasis">mdi-open-in-new</v-icon>
            </v-btn>
          </div>
          <v-scroll-y-reverse-transition>
            <div v-if="!showButtons" class="d-flex">
              <div class="block d-flex">
                <v-btn prepend-icon="mdi-lightning-bolt" variant="flat" rounded="lg" color=""
                @click="router.push({ path: '/get-started' })">Get started</v-btn>
              </div>
              <div class="d-flex mx-5">
                <v-btn variant="flat" rounded="lg" color="onBackground" append-icon="mdi-arrow-right"
                  @click="router.push({ path: '/login' })">Se connecter
                </v-btn>
              </div>
            </div>
          </v-scroll-y-reverse-transition>

        </template>


        <v-spacer />


        <!-- Menu utilisateur -->
        <v-menu v-if="isLoggedIn" color="primary" :close-on-content-click="false" location="bottom end" offset="10">
          <template v-slot:activator="{ props }">
            <v-tooltip location="bottom" text="Profil">
              <template v-slot:activator="{ props: tooltipProps }">
                <v-btn icon="mdi-account-outline" color="primary" variant="tonal" class="mr-2" v-bind="{ ...props, ...tooltipProps }">
                  <v-avatar size="40" class="" variant="tonal"   >
                    <v-img v-if="authStore.avatar" :src="`${API_URL}${authStore.avatar}`" alt="Avatar" />
                    <v-icon v-else>mdi-account</v-icon>
                  </v-avatar>
                </v-btn>
              </template>
            </v-tooltip>
          </template>
          <v-card min-width="300" class="pa-4" color="onBackground" rounded="xl">
            <v-list class="bg-onBackground">
              <v-list-item>
                <template v-slot:prepend>
                  <v-avatar size="40" class="" variant="tonal"   >
                    <v-img v-if="authStore.avatar" :src="`${API_URL}${authStore.avatar}`" alt="Avatar" />
                    <v-icon v-else>mdi-account</v-icon>
                  </v-avatar>
                
                </template>
                <v-list-item-title class="text-h6">{{ username }}</v-list-item-title>
                <v-list-item-subtitle>{{ authStore.email }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-divider />
            <v-list class="bg-onBackground">
              <v-list-item>
                <div class="d-flex justify-space-between align-center">
                  <div class="d-flex align-center">
                    <v-icon color="onPrimary" icon="mdi-unicorn-variant"></v-icon>
                    <div class="d-flex justify-space-between flex-column align-center ml-4">
                      <v-list-item-title class="text-h5 font-weight-bold mb-0 pa-0">{{ points }}</v-list-item-title>
                      <v-list-item-subtitle
                        class="text-caption font-weight-bold mt-n2 pa-0">Points</v-list-item-subtitle>
                    </div>
                  </div>
                  <div class="d-flex align-center">
                    <v-icon color="onPrimary" icon="mdi-account-group"></v-icon>
                    <v-list-item-title class="text-subtitle-1 font-weight-bold ml-2">Équipe</v-list-item-title>
                    <v-list-item-subtitle class="ml-2"> {{' '+ currentTeam?.name || 'Non assigné' }} {{ currentTeam?.type === 'Renfort' ?
                      '(Renfort)' : '' }}</v-list-item-subtitle>
                  </div>
                </div>
              </v-list-item>
           
            </v-list>
            <v-divider />
            <v-list class="bg-onBackground">
              <v-list-item @click="navigateToProfile" rounded="lg" prepend-icon="mdi-account-cog">
                <v-list-item-title>Profil</v-list-item-title>
              </v-list-item>
              <v-list-item @click="navigateToParameter" rounded="lg" prepend-icon="mdi-cog">
                <v-list-item-title>Paramètres</v-list-item-title>
              </v-list-item>
              <v-list-item @click="handleLogout" rounded="lg" prepend-icon="mdi-logout" color="error">
                <v-list-item-title>Se déconnecter</v-list-item-title>
              </v-list-item>
            </v-list>
            <div class="d-flex justify-end">
              <v-btn prepend-icon="mdi-information-outline" variant="text" color="background" class="text-body-2" @click="router.push({ path:'/contact-admin'})">Assistance</v-btn>
            </div>
          </v-card>
    
        </v-menu>
      </template>
    </template>
  </v-app-bar>



  <NotificationsDialog v-model:isDialogOpen="isDialogOpen" v-if="isLoggedIn" :user-id="authStore.userId"
    :notifications="notificationStore.notifications" @markAsRead="handleMarkAsRead"
    @clearNotifications="handleClearNotifications" />
</template>

<script setup>
import { usePointStore } from '@/stores/pointStore.js';
import NotificationsDialog from "@/components/NotificationsDialog.vue";
import {useDisplay} from "vuetify";
import {useAuthStore} from "@/stores/authStore.js";
import {useTeamStore} from "@/stores/teamStore.js";
import {useRoute, useRouter} from "vue-router";
import {ref, computed, onMounted, onUnmounted, watch} from "vue";
import { useNotificationStore } from '../../stores/notificationStore';
import { useTheme } from 'vuetify';
import { API_URL } from '@/config/api';
import { useMessageStore } from '../../stores/messageStore';
import BottomNavigation from '@/layouts/components/BottomNavigation.vue';


const props = defineProps({
  showButtons: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["toggle-mobile-drawer", "toggle-drawer"]);

// Constants
const APP_TITLE = "Céleste";
const CARD_TEXT = "Remplacer";

const PARAMETER_PATH = "/parameter";
const HOME_PATH = "/landing";
const USER_IMAGE = "https://randomuser.me/api/portraits/women/31.jpg";

// State
const {smAndDown} = useDisplay();
const isDialogOpen = ref(false);
const isMenuOpen = ref(false);
const NOTIFICATION_COUNT = computed(() => notificationStore.unreadCount);
const theme = useTheme();
const pointStore = usePointStore();
const points = computed(() => pointStore.points);

// Router
const router = useRouter();
const route = useRoute();

// Auth Store
const authStore = useAuthStore();
const teamStore = useTeamStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);
const isAdmin = computed(() => authStore.isAdmin);
const isHomepage = computed(() => route.name === "/landing");
const isDashboard = computed(() => route.name === "/dashboard");
const notificationInterval = ref(null);
const PROFILE_PATH = "/profile/"+ authStore.userId;
// Computed properties for user info
const username = computed(() => authStore.name);
const currentTeam = computed(() => teamStore.currentTeam);

// Theme synchronization
const isDarkTheme = computed({
  get: () => theme.global.current.value.dark,
  set: (value) => {
    authStore.updateUserPreferences({ theme: value });
    theme.global.name.value = value ? 'darkTheme' : 'lightTheme';
  }
});

// Functions
const handleTitleClick = () => {
  router.push({path: HOME_PATH});
};

const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value;
};

const toggleNotifications = (event) => {
  isDialogOpen.value = !isDialogOpen.value;
};

const toggleMobileDrawer = (event) => {
  emit("toggle-mobile-drawer");
};

const toggleDrawer = (event) => {
  emit('toggle-drawer');
};

const navigateToProfile = () => {
  router.push({path: PROFILE_PATH});
};

const navigateToParameter = () => {
  router.push({path: PARAMETER_PATH});
};

const navigateToContact = () => {
  router.push({path: '/contact-admin'});
};

const handleLogout = async () => {
  await authStore.logOut();
  router.push({path: '/login'});
};

const notificationStore = useNotificationStore();
const messageStore = useMessageStore();

const fetchNotifications = async () => {
  if (authStore.userId) {
    await notificationStore.fetchNotifications(authStore.userId);
  }
};

onMounted(async () => {


  if (authStore.userId) {
    await teamStore.fetchCurrentTeamOfUser(authStore.userId);
    await fetchNotifications(authStore.userId);
    await pointStore.fetchUserPoints();
  }
  // Rafraîchir les notifications toutes les 30 secondes
  notificationInterval.value = setInterval(fetchNotifications, 30000);
  
});

onUnmounted(() => {
  // Nettoyer l'intervalle lors du démontage du composant
  if (notificationInterval.value) {
    clearInterval(notificationInterval.value);
  }
});

const handleMarkAsRead = async (id) => {
  await notificationStore.markAsRead(id);
};

const handleClearNotifications = async () => {
  await notificationStore.clearNotifications(authStore.userId);
};

const isActive = (path) => {
  return router.currentRoute.value.path === path;
};

const openIcnagenda = () => {
  window.open('https://icnagenda.FR', '_blank');
};

const openOlafatco = () => {
  window.open('https://olafatco.dsna.aviation-civile.gouv.fr/gerer-la-licence', '_blank');
};



</script>

<style scoped>
.block {
  position: relative; /* Nécessaire pour positionner ::after */
  z-index: 0; /* Supprime le contexte inutile */
  overflow: visible !important;
  opacity: 1 !important;

}


.block:after, .block:before {
  content: '';
  position: absolute;
  left: -1.5px;
  top: -1.5px;
  border-radius: 10px;
  background: linear-gradient(45deg, #ffc0d4, rgba(237, 202, 255, 0.94), rgba(250, 152, 248, 0.05),
  rgba(159, 159, 248, 0.22), #ffccdd);
  background-size: 400%;
  width: calc(100% + 3px);
  height: calc(100% + 3px);
  z-index: -1; /* Cela fonctionne si le stacking context de `.block` est supprimé */
  animation: steam 7s linear infinite;

}

@keyframes steam {
  0% {
    background-position: 0 0;
  }

  80% {
    background-position: 400% 0;
  }

  100% {
    background-position: 400% 0;
  }
}

.block:after {
  filter: blur(5px);
}

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

.nav-link:hover {
  color: #84d0ff !important; /* Change to your desired hover color */
  transition: color 0.3s ease;
}


:deep(.nav-link.v-btn .v-btn__overlay) {
  background-color: transparent !important;
  opacity: 0 !important;
}

.v-card p {
  line-height: 1.25rem;
  font-size: 0.625rem;
}

.bite {
  border-radius: 20px !important;
}

.bottom-nav {
  position: fixed;
 
 
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);


 
}






.active-item {
  color: rgba(var(--v-theme-primary), 1) !important;
  background-color: transparent !important;
}

:deep(.v-list-item) .v-list-item__overlay {
  background-color: transparent !important;
}


</style>
