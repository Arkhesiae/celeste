<template>
  <v-app>
   
      <router-view v-slot="{ Component, route }">
        <transition :name="route.meta.transition || ''"  mode="out-in">
          <component :is="Component" class="page"/>
        </transition>
      </router-view>
 
  </v-app>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore.js";
import { useTheme } from 'vuetify';


const authStore = useAuthStore();
const theme = useTheme();

onMounted(() => {
  authStore.loadFromLocalStorage();
  if (authStore.isLoggedIn) {
 
    theme.global.name.value = authStore.preferences.theme ? 'darkTheme' : 'lightTheme';
  }
});

</script>

<style>



/* Add this to your main CSS file or in the <style> section of your main Vue component */
.v-btn {
  text-transform: none;
  /* Optionally, add custom logic to capitalize only the first letter if needed */
}

/* Styles de transition globaux */
.slide-lefty-enter-active,
.slide-lefty-leave-active,
.slide-righty-enter-active,
.slide-righty-leave-active {
  transition: all 0.3s cubic-bezier(1.0, 0.5, 0.8, 1.0) !important;
}

.slide-lefty-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.slide-lefty-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.slide-righty-enter-from {
  opacity: 0;  transform: scale(0.98);
} 

.slide-righty-leave-to {
  opacity: 0;
  transform: translateX(100%);
}


</style>
