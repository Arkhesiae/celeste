<template>
  <v-navigation-drawer
  
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
  
      <!-- <v-list-item @click="router.push({ path: '/permutations' })"
      rounded="xl" 
                   
                   :prepend-icon="isActive('/permutations') ? 'mdi-swap-horizontal' : 'mdi-swap-horizontal-hidden'"
                   title="Permutations"
                   value="permutations"></v-list-item> -->
      <v-list-item @click="router.push({ path: '/exchange/replace' })"
         rounded="xl"
         class="d-flex align-center"
         :class="isActive('/exchange/replace') ? 'active-item' : 'inactive-item'"
         :prepend-icon="isActive('/exchange/replace') ? 'mdi-account-arrow-left' : 'mdi-account-arrow-left-outline'"
         title="Demandes"
         value="replace"> 
        <template #append>
          <v-chip color="background" size="x-small" variant="flat" rounded="lg" class="font-weight-bold ml-2 "  v-if="demandsCount > 0">
            <span class="font-weight-bold">{{ demandsCount }}</span>
          </v-chip>
        </template>
      </v-list-item>

      <v-list-item @click="router.push({ path: '/calendar' })"
                   rounded="xl"
                   :class="isActive('/calendar') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/calendar') ? 'mdi-calendar' : 'mdi-calendar-outline'"
                   title="Calendrier"
                   value="rep"></v-list-item>

      <v-list-item @click="router.push({ path: '/rotation' })"
                   rounded="xl"
                   :class="isActive('/rotation') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/rotation') ? 'mdi-file-plus' : 'mdi-file-plus-outline'"
                   title="Tour de service"
                   value="tservice"></v-list-item>
      <v-list-item @click="router.push({ path: '/patchnotes' })"
                   rounded="xl"
                   :class="isActive('/patchnotes') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/patchnotes') ? 'mdi-update' : 'mdi-update'"
                   title="Patch Notes"
                   value="patchnotes"></v-list-item>
      <v-list-item @click="router.push({ path: '/financement' })"
                   rounded="xl"
                   :class="isActive('/financement') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/financement') ? 'mdi-currency-eur' : 'mdi-currency-eur'"
                   title="Financement"
                   value="financement"></v-list-item>
      <v-divider opacity=".01"></v-divider>
      <v-list-item 
               v-if="authStore.isAdmin"
      @click="router.push({ path: '/users' })"
                   rounded="xl"
                   :class="isActive('/users') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/users') ? 'mdi-account-group' : 'mdi-account-group-outline'"
                   title="Utilisateurs"
                   value="users"></v-list-item>
      <v-list-item v-if="authStore.isAdmin" 
                   @click="router.push({ path: '/admin/pending-users' })"
                   rounded="xl"
                   :class="isActive('/admin/pending-users') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/admin/pending-users') ? 'mdi-account-clock' : 'mdi-account-clock-outline'"
                   title="Candidatures"
                   value="pending-users"></v-list-item>
      <v-list-item v-if="authStore.adminType === 'master'"
                   @click="router.push({ path: '/center/centers' })"
                   rounded="xl"
                   :class="isActive('/center/centers') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/center/centers') ? 'mdi-home' : 'mdi-home-outline'"
                   title="Centres"
                   value="centers"></v-list-item>
      <v-list-item v-else
                   @click="router.push({ path: '/center/'+authStore.centerId+'/teams' })"
                   rounded="xl"
                   :class="isActive('/center/'+authStore.centerId+'/teams') ? 'active-item' : 'inactive-item'"
                   :prepend-icon="isActive('/center/'+authStore.centerId+'/teams') ? 'mdi-airport' : 'mdi-airport'"
                   title="Mon centre"
                   value="my-center"></v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/stores/authStore.js";
import { computed } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useNotificationStore } from '@/stores/notificationStore';


const substitutionStore = useSubstitutionStore();
const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);
const demandsCount = computed(() => substitutionStore.availableSubstitutions.length + substitutionStore.availableSwitches.length + substitutionStore.otherDemands.length);


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
  color: rgba(var(--v-theme-background), 1) !important;
  font-weight: 900 !important;
  background-color: transparent !important;
}
.inactive-item {
  color: rgba(var(--v-theme-background), .51) !important;
  font-weight: 400 !important;
  background-color: transparent !important;
}
:deep(.v-list-item) .v-list-item__overlay {
  background-color: transparent !important;
}

:deep(.v-list-item) .v-list-item__prepend{
  transition: transform 0.2s ease-out;
  transform-origin: left;
} 

:deep(.v-list-item):hover .v-list-item__prepend{
  transform: scale(1.15);

}
.user-safe-area {
  padding-top: env(safe-area-inset-top) !important;
}
</style>


