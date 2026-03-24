<template>
  <div>
    <div
      class="position-fixed ma-2"
      style="bottom: 0; right: 0 ; z-index: 99"
    >
      <v-btn
        color="background"
        flat
        class="mr-2 auto-login-btn"
        :class="{ 'selected': selectedRole === 'master' }"
        icon="mdi-star-four-points"
        @click="autoLogin('master')"
      >
        Master
      </v-btn>
      <v-btn
        color="background"
        flat
        class="mr-2 auto-login-btn"
        :class="{ 'selected': selectedRole === 'admin' }"
        icon="mdi-shield-crown-outline"
        @click="autoLogin('admin')"
      >
        Local
      </v-btn>
      <v-btn
        color="background"
        flat
        class="mr-2 auto-login-btn"
        :class="{ 'selected': selectedRole === 'user' }"
        icon="mdi-account-outline"
        @click="autoLogin('user')"
      >
        User
      </v-btn>
      <!-- <v-btn  class="mr-2 auto-login-btn" icon="mdi-account-multiple" @click="showTeamUsers = !showTeamUsers">Team Users</v-btn> -->
      <v-btn
        icon="mdi-logout"
        color="error"
        @click="handleLogout"
      />

      <!-- Menu des utilisateurs d'équipe -->
      <!-- <v-menu
        v-model="showTeamUsers"
        :close-on-content-click="false"
        location="top"
      >
        <template #activator="{ props }">
          <div v-bind="props" />
        </template>
        <v-card min-width="300">
          <v-card-title class="text-h6">
            Utilisateurs d'équipe
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              class="ml-2"
              :loading="generatingUsers"
              @click="generateTeamUsers"
            />
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="user in teamUsers"
                :key="user.email"
                :title="user.name"
                :subtitle="user.email"
                @click="autoLoginTeamUser(user)"
              >
                <template #prepend>
                  <v-avatar
                    color="primary"
                    size="32"
                  >
                    {{ user.name.charAt(0) }}
                  </v-avatar>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-menu> -->
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from "@/stores/authStore.js";
// import { useAppInitialization } from '@/composables/useAppInitialization';

const authStore = useAuthStore();
const router = useRouter();
// const { initializeApp } = useAppInitialization();
const adminEmail = import.meta.env.VITE_ADMIN_MAIL;
const adminPassword = import.meta.env.VITE_ADMIN_PASS;

const localAdminEmail = import.meta.env.VITE_LOCAL_ADMIN_MAIL;
const localAdminPassword = import.meta.env.VITE_LOCAL_ADMIN_PASS;

const handleLogout = async () => {
  authStore.logOut();
  await router.push({ path: "/login", replace: true });
};

const selectedRole = computed(() => {
  return authStore.userData?.adminType;
});

const autoLogin = async (role) => {
  try {
    await authStore.logOut(); // Déconnexion de l'utilisateur actuel

    let credentials = {};
    
    if (role === 'admin') {
      credentials = {
        email: localAdminEmail,
        password: localAdminPassword,
      }
    
    } else if (role === 'master') {
      credentials = {
        email: adminEmail,
        password: adminPassword,
      }
    }

    await authStore.logIn(credentials);
    router.push({ path: "/dashboard", replace: true });
 
  } catch (error) {
    console.error(`Échec de la connexion automatique en tant que ${role}:`, error);

  }
};

</script> 


<style scoped>
  .auto-login-btn {
    border-radius: 16px !important;
    padding: 8px 16px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    border: 1px solid rgba(var(--v-theme-surface), 0.8) !important;


  }

  .auto-login-btn.selected {
    border: 1px solid rgba(var(--v-theme-primary), 1) !important;
  }
</style>