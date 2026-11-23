<template>
  <v-main>
    <router-view v-slot="{ Component }">
      <component :is="Component" />
    </router-view>
  </v-main>
</template>

<script setup>
// Layout minimaliste sans app bar ni navigation
import { useScrollRestoration } from 'vue-router/experimental';

// Défilement des pages hors onglets (en haut) : le choix par chemin est dans les options du plugin (router/scrollRestoration.js)
useScrollRestoration();
</script>

<style scoped></style>
