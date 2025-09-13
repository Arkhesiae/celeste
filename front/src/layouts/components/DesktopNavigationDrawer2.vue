<template>
  <v-navigation-drawer :model-value="navExpanded" @update:model-value="$emit('update:navExpanded', $event)"
    v-if="!smAndDown && isLoggedIn" border="none" order="-20" color="surfaceContainer" open-delay="200"
    class="px-2 pt-16" elevation="0" flat style="transition: all .25s ease-in-out; display: flex !important;">
    <v-list variant="text" active-class="active-item" nav class="pl-4 mt-16">
   

      <!-- Regular navigation items -->
      <v-list-item :ripple="false" v-for="navItem in navigationItems" :key="navItem.path"
        @click="router.push({ path: navItem?.path })" rounded="xl"
        :class="isActive(navItem?.path) ? 'active-item' : 'inactive-item'"  :title="navItem?.title" :value="navItem?.value">

        <template #item>
          <span class="text-body-2">{{ navItem?.title }}</span>
        </template>

        <template #prepend>
          <v-icon size="16" :icon="isActive(navItem?.path) ? navItem?.iconActive : navItem?.iconInactive" />
        </template>
        <template #append v-if="navItem?.badgeCount">
          <v-chip color="background" size="x-small" variant="flat" rounded="lg" class="font-weight-bold ml-2"
            v-if="demandsCount > 0">
            <span class="font-weight-bold">{{ demandsCount }}</span>
          </v-chip>
        </template>
      </v-list-item>

      <v-divider opacity=".01"></v-divider>

      <!-- Admin navigation items -->
      <v-list-item v-if="isAdmin" v-for="adminItem in adminNavigationItems" :key="adminItem.path"
        @click="router.push({ path: adminItem?.path })" rounded="xl"
        :class="isActive(adminItem?.path) ? 'active-item' : 'inactive-item'" :ripple="false" :title="adminItem?.title" :value="adminItem?.value">

        <template #prepend>
          <v-icon size="16" :icon="isActive(adminItem?.path) ? adminItem?.iconActive : adminItem?.iconInactive" />
        </template>
        <template #append v-if="adminItem?.badgeCount">
          <v-chip color="background" size="x-small" variant="flat" rounded="lg" class="font-weight-bold ml-2"
            v-if="adminItem?.badgeCount > 0">
            <span class="font-weight-bold">{{ adminItem?.badgeCount }}</span>
          </v-chip>
        </template>
      </v-list-item>

           <!-- Admin navigation items -->
           <v-list-item v-if="isMaster" v-for="adminItem in masterNavigationItems" :key="adminItem.path"
        @click="router.push({ path: adminItem?.path })" rounded="xl"
        :class="isActive(adminItem?.path) ? 'active-item' : 'inactive-item'" :ripple="false" :title="adminItem?.title" :value="adminItem?.value">

        <template #prepend>
          <v-icon size="16" :icon="isActive(adminItem?.path) ? adminItem?.iconActive : adminItem?.iconInactive" />
        </template>
        <template #append v-if="adminItem?.badgeCount">
          <v-chip color="background" size="x-small" variant="flat" rounded="lg" class="font-weight-bold ml-2"
            v-if="adminItem?.badgeCount > 0">
            <span class="font-weight-bold">{{ adminItem?.badgeCount }}</span>
          </v-chip>
        </template>
      </v-list-item>

   
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useDisplay } from "vuetify";
import { useAuthStore } from "@/stores/authStore.js";
import { computed, ref } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

const substitutionStore = useSubstitutionStore();
const router = useRouter();
const { smAndDown } = useDisplay();
const authStore = useAuthStore();
const isLoggedIn = computed(() => authStore.isLoggedIn);
const demandsCount = computed(() => substitutionStore.availableSubstitutions.length + substitutionStore.availableSwitches.length + substitutionStore.otherDemands.length);


const isActive = (path) => {
  return router.currentRoute.value.path === path;
};

const isAdmin = computed(() => authStore.userData.isAdmin);

const isMaster = computed(() => authStore.userData.adminType === 'master');

const pendingUsersCount = computed(() => {
  return userStore.users.filter(user => user.registrationStatus === 'pending').length;
});


// Navigation items configuration
const navigationItems = computed(() => [
  {
    path: '/exchange/replace',
    title: 'Demandes',
    value: 'replace',
    iconActive: 'mdi-account-arrow-left',
    iconInactive: 'mdi-account-arrow-left-outline',
    badgeCount: demandsCount.value,
  },
  {
    path: '/calendar',
    title: 'Calendrier',
    value: 'rep',
    iconActive: 'mdi-calendar',
    iconInactive: 'mdi-calendar-outline'
  },
  {
    path: '/rotation',
    title: 'Tours de service',
    value: 'tservice',
    iconActive: 'mdi-file-plus',
    iconInactive: 'mdi-file-plus-outline'
  },
  {
    path: '/patchnotes',
    title: 'Patchnotes',
    value: 'patchnotes',
    iconActive: 'mdi-update',
    iconInactive: 'mdi-update'
  },
  {
    path: '/financement',
    title: 'Financement',
    value: 'financement',
    iconActive: 'mdi-currency-eur',
    iconInactive: 'mdi-currency-eur'
  },
  {
    path: `/center/${authStore.userData.centerId}/teams`,
    title: 'Mon centre',
    value: 'my-center',
    iconActive: 'mdi-airport',
    iconInactive: 'mdi-airport',
    condition: !isMaster.value
  }
]);

const adminNavigationItems = computed(() => [
  {
    path: '/users',
    title: 'Utilisateurs',
    value: 'users',
    iconActive: 'mdi-account-group',
    iconInactive: 'mdi-account-group-outline',

  },
  {
    path: '/admin/pending-users',
    title: 'Candidatures',
    value: 'pending-users',
    iconActive: 'mdi-account-clock',
    iconInactive: 'mdi-account-clock-outline',

    badgeCount: pendingUsersCount.value
  },

]);

const masterNavigationItems = computed(() => [
  {
    path: '/center/centers',
    title: 'Centres',
    value: 'centers',
    iconActive: 'mdi-home',
    iconInactive: 'mdi-home-outline',
  }
]);

defineProps({
  navExpanded: {
    type: Boolean,
    required: true
  }
});
</script>

<style scoped>
.active-item {
  color: rgba(var(--v-theme-onBackground), 1) !important;
  font-weight: 900 !important;
  background-color: transparent !important;
}

.inactive-item {
  color: rgba(var(--v-theme-onBackground), .51) !important;
  font-weight: 400 !important;
  background-color: transparent !important;
}

:deep(.v-list-item) .v-list-item__overlay {
  background-color: transparent !important;
}

:deep(.v-list-item) .v-list-item__prepend {
  transition: transform 0.2s ease-out;
  transform-origin: center;
}

.user-safe-area {
  padding-top: env(safe-area-inset-top) !important;
}
</style>