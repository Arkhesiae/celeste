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

    <span class="text-overline text-medium-emphasis ml-2">
      alpha 6.25
    </span>
    </div>
  </v-app-bar-title>
</template>

<script setup>
// Constants
const APP_TITLE = "Céleste";

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
</script> 
<style scoped>
.celeste-logo {
  width: 30px;
  height: 30px;

  margin-right: 5px;
}
</style>