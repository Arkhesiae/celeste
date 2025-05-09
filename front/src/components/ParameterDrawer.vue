<template>
  <v-navigation-drawer location="right"  order="-1" floating>
    <LogOutButton v-if="isLoggedIn"></LogOutButton>
    <v-list
      class="pl-2 justify-space-between d-flex flex-column fill-height"
    >
      <!--      THEME TOGGLE     -->
      <v-list-item>
        <p class="text-h6">Apparence</p>
        <v-switch
          class="ml-4"
          v-model="switchValue"
          @change="setTheme"
          label="Theme sombre"
          hide-details
        ></v-switch>
      </v-list-item>

      <!--      ASSIST AND CONTACT    -->
      <v-list-item>
        <v-divider>
        </v-divider>
        <p class="text-h6">Assistance</p>

      </v-list-item>
    </v-list>
  </v-navigation-drawer>

</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAppStore } from '../stores/app';
import { useTheme } from 'vuetify';
import LogOutButton from "@/components/LogOutButton.vue";
import { useAuthStore } from "@/stores/authStore";
import { useSnackbarStore } from "@/stores/snackbarStore";

interface UserPreferences {
  theme: boolean;
}

const theme = useTheme();
const appStore = useAppStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

const switchValue = ref(false);

const userPreferences = computed<UserPreferences>(() => ({
  theme: switchValue.value
}));

const isLoggedIn = computed(() => authStore.isLoggedIn);

const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark';
};

const setTheme = async () => {
  appStore.setTheme(switchValue.value);
  await updateUserPreferences();
};

const updateUserPreferences = async () => {
  try {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    const response = await fetch(`${import.meta.env.VITE_API_URL}/users/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ preferences: userPreferences.value })
    });

    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }

    snackbarStore.showNotification('Préférences mises à jour', 'success');
  } catch (error) {
    console.error('Error updating preferences:', error);
    snackbarStore.showNotification('Erreur lors de la mise à jour des préférences', 'error');
  }
};

// Synchroniser le switch avec le thème actuel
watch(() => theme.global.current.value.dark, (isDark) => {
  switchValue.value = isDark;
}, { immediate: true });
</script>

<style scoped>
.v-navigation-drawer {
  border-radius: 16px 0 0 16px;
  margin: 16px;
  height: calc(100% - 32px);
}
</style>
