<template>
  <div>
    <BackToolbar />

    <v-main class="alternative-main">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </v-main>
  </div>
</template>

<script setup>
import { useScrollRestoration } from 'vue-router/experimental';

// Layout des pages hors onglets (informations, tours de service, utilisateurs, tickets...) : une barre avec une flèche de retour vers l'onglet,
// sans tiroirs ni barre du bas.
// Défilement des pages hors onglets (en haut) : le choix par chemin est dans les options du plugin (router/scrollRestoration.js)
useScrollRestoration();
</script>

<style scoped>
.alternative-main {
  padding-top: calc(var(--safe-area-top, 0px) + var(--v-layout-top)) !important;
}
</style>
