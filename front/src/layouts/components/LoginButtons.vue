<template>
  <div>
    <div class="position-fixed ma-2" style="bottom: 0; right: 0 ; z-index: 99">
      <v-btn color="background" flat  class="mr-2 auto-login-btn" :class="{ 'selected': selectedRole === 'master' }" icon="mdi-star-four-points" @click="autoLogin('master')">Master</v-btn>
      <v-btn color="background" flat class="mr-2 auto-login-btn" :class="{ 'selected': selectedRole === 'admin' }" icon="mdi-shield-crown-outline" @click="autoLogin('admin')">Local</v-btn>
      <v-btn color="background" flat class="mr-2 auto-login-btn" :class="{ 'selected': selectedRole === 'user' }" icon="mdi-account-outline" @click="autoLogin('user')">User</v-btn>
      <!-- <v-btn  class="mr-2 auto-login-btn" icon="mdi-account-multiple" @click="showTeamUsers = !showTeamUsers">Team Users</v-btn> -->
      <v-btn  icon="mdi-logout" color="error" @click="handleLogout"></v-btn>

      <!-- Menu des utilisateurs d'équipe -->
      <!-- <v-menu
        v-model="showTeamUsers"
        :close-on-content-click="false"
        location="top"
      >
        <template v-slot:activator="{ props }">
          <div v-bind="props"></div>
        </template>
        <v-card min-width="300">
          <v-card-title class="text-h6">
            Utilisateurs d'équipe
            <v-btn
              icon="mdi-refresh"
              variant="text"
              size="small"
              class="ml-2"
              @click="generateTeamUsers"
              :loading="generatingUsers"
            ></v-btn>
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
                <template v-slot:prepend>
                  <v-avatar color="primary" size="32">
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
import { useAppInitialization } from '@/composables/useAppInitialization';

const authStore = useAuthStore();
const router = useRouter();
const { initializeApp } = useAppInitialization();
const adminEmail = import.meta.env.VITE_ADMIN_MAIL;
const adminPassword = import.meta.env.VITE_ADMIN_PASS;


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
  
    
    if (role === 'admin') {
      await authStore.logIn({
        email: 'localadmin@celeste.com',
        password: 'adminpassword',
      });
    } else if (role === 'user') {
      await authStore.logIn({
        email: 'user@example.com',
        password: 'userpassword',
      });
    } else if (role === 'master') {
      await authStore.logIn({
        email: adminEmail,
        password: adminPassword,
      });
    }

        // Initialiser l'application avec le callback de progression
    // await initializeApp();
    router.push({ path: "/dashboard", replace: true });
 
  } catch (error) {
    console.error(`Échec de la connexion automatique en tant que ${role}:`, error);

  }
};

// const generateTeamUsers = async () => {
//   try {
//     generatingUsers.value = true;
//     const response = await fetch(`${API_URL}/dev/populate-users`, {
//       method: 'POST',
//       headers: {
//           'Authorization': `Bearer ${authStore.accessToken}`,
//           'Content-Type': 'application/json'
//       },

//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     if (data.success) {
//       await fetchTeamUsers();
//     } else {
//       throw new Error(data.message || 'Erreur lors de la génération des utilisateurs');
//     }
//   } catch (error) {
//     console.error('Erreur lors de la génération des utilisateurs:', error);
//   } finally {
//     generatingUsers.value = false;
//   }
// };

// const fetchTeamUsers = async () => {
//   try {
//     const response = await fetch(`${API_URL}/users/devlist?role=team`, {
//       headers: {
//         'Authorization': `Bearer ${authStore.accessToken}`,
//         'Content-Type': 'application/json'
//       }
//     });
//     const data = await response.json();
//     teamUsers.value = data;
//   } catch (error) {
//     console.error('Erreur lors de la récupération des utilisateurs:', error);
//     teamUsers.value = [];
//   }
// };

// const autoLoginTeamUser = async (user) => {
//   try {

//     await authStore.logOut();
//     await authStore.logIn({
//       email: user.email,
//       password: 'user',
//     });

//     // Initialiser l'application avec le callback de progression
//     await initializeApp();
//     router.push({ path: "/dashboard", replace: true });
//     showTeamUsers.value = false;
//   } catch (error) {
//     console.error('Échec de la connexion:', error);
 
//   }
// };

// onMounted(() => {
//   fetchTeamUsers();
// });
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