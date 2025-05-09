<template>
  <v-navigation-drawer
    rail
    floating
    expand-on-hover
    :model-value="navExpanded"
    @update:model-value="$emit('update:navExpanded', $event)"
    v-if="!smAndDown && isLoggedIn"
    rounded="xl"
    open-delay="200"
    color="transparent"
    
    rail-width="106"
    style="transition: all .25s ease-in-out; display: flex !important; box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.0) !important;"
  >
    <v-list variant="text" active-class="active-item" base-color="background" nav bg-color="onBackground" class="pa-4 elevation-3 ma-4 mt-16" rounded="xl">
  
      <v-list-item @click="router.push({ path: '/permutations' })"
      rounded="xl" 
                   :prepend-icon="isActive('/permutations') ? 'mdi-swap-horizontal' : 'mdi-swap-horizontal-hidden'"
                   title="Permutations"
                   value="permutations"></v-list-item>
      <v-list-item @click="router.push({ path: '/exchange/replace' })"
         
         rounded="xl"
                   :prepend-icon="isActive('/exchange/replace') ? 'mdi-account-arrow-left' : 'mdi-account-arrow-left-outline'"
                   title="Remplacements"></v-list-item>

      <v-list-item @click="router.push({ path: '/calendar' })"
                   rounded="xl"
                   :prepend-icon="isActive('/calendar') ? 'mdi-calendar' : 'mdi-calendar-outline'"
                   title="Calendrier"
                   value="rep"></v-list-item>

      <v-list-item @click="router.push({ path: '/rotation' })"
                   rounded="xl"
                   :prepend-icon="isActive('/rotation') ? 'mdi-file-plus' : 'mdi-file-plus-outline'"
                   title="Tour de service"
                   value="tservice"></v-list-item>
      <v-divider opacity=".01"></v-divider>
      <v-list-item @click="router.push({ path: '/users' })"
                   rounded="xl"
                   :prepend-icon="isActive('/users') ? 'mdi-account-group' : 'mdi-account-group-outline'"
                   title="Utilisateurs"
                   value="users"></v-list-item>
      <v-list-item @click="router.push({ path: '/center/centers' })"
                   rounded="xl"
                   :prepend-icon="isActive('/center/centers') ? 'mdi-home' : 'mdi-home-outline'"
                   title="Centres"
                   value="centers"></v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/stores/authStore.js";
import { computed } from 'vue';

const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);

const isActive = (path) => {
  return router.currentRoute.value.path === path;
};

defineProps({
  navExpanded: {
    type: Boolean,
    required: true
  }
  });
</script> 

<style scoped>
.active-item {
  color: rgba(var(--v-theme-onPrimary), 1) !important;
  background-color: transparent !important;
}

:deep(.v-list-item) .v-list-item__overlay {
  background-color: transparent !important;
}
</style>


