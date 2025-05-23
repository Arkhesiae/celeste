<template>
  <div class="position-fixed ma-2" style="bottom: 0; right: 0 ; z-index: 99">
    <v-btn variant="tonal" class="mr-2" icon="mdi-star-four-points" @click="autoLogin('master')">Master</v-btn>
    <v-btn variant="tonal" class="mr-2" icon="mdi-shield-crown-outline" @click="autoLogin('admin')">Local</v-btn>
    <v-btn variant="tonal" class="mr-2" icon="mdi-account-outline" @click="autoLogin('user')"></v-btn>
    <v-btn variant="tonal" icon="mdi-logout" color="error" @click="handleLogout"></v-btn>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from "@/stores/authStore.js";

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await authStore.logOut();
  await router.push({ path: "/login", replace: true });
};

const autoLogin = async (role) => {
  try {
    authStore.logOut(); // Déconnexion de l'utilisateur actuel
    if (role === 'admin') {
      await authStore.logIn({
        email: 'localadmin@example.com',
        password: 'adminpassword',
      });
    } else if (role === 'user') {
      await authStore.logIn({
        email: 'user@example.com',
        password: 'userpassword',
      });
    } else if (role === 'master') {
      await authStore.logIn({
        email: 'masteradmin@example.com',
        password: 'adminpassword',
      });
    }
    await router.push({ path: "/dashboard", replace: true });
  } catch (error) {
    console.error(`Échec de la connexion automatique en tant que ${role}:`, error);
  }
};
</script> 