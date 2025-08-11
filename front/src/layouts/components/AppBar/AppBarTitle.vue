<template>
  <v-app-bar-title @click="$emit('title-click')" class="d-flex align-center" >
    <div class="d-flex align-center ">
    <Logo />
    <v-btn 
      flat 
      color="remplacement" 
      class="text-overline" 
      style="font-weight: 900 !important;" 
      :active="isHomepage || isDashboard"
    >
      {{ APP_TITLE }} 
    </v-btn>

    <v-hover v-slot="{ isHovering, props }">
      <v-slide-y-transition mode="out-in"> 
       <div v-if="!isHovering">
        <span 
        v-bind="props"
        class="text-overline text-medium-emphasis ml-2"
        >
        {{ APP_VERSION }}
          
        </span>
      </div>
      <div v-else>
        <span 
        v-bind="props"
        class="text-overline text-medium-emphasis ml-2"
        >
        {{ RELEASE_DATE }}
          
        </span>
      </div>
      </v-slide-y-transition>
    </v-hover>
    </div>
  </v-app-bar-title>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// Constants
const APP_TITLE = "Céleste";
const APP_VERSION = "alpha-202508.1";
const RELEASE_DATE = "09/08/2025";

// Reactive data
const currentDate = ref('');

// Props
defineProps({
  isHomepage: {
    type: Boolean,
    default: false
  },
  isDashboard: {
    type: Boolean,
    default: false
  }
});

// Emits
defineEmits(['title-click']);

// Methods
const updateDate = () => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Lifecycle
onMounted(() => {
  updateDate();
});
</script> 
<style scoped>
.celeste-logo {
  width: 30px;
  height: 30px;

  margin-right: 5px;
}
</style>