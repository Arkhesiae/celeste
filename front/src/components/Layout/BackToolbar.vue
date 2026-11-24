<template>
  <!-- Barre des pages hors onglets (layout `alternative`) : la flèche dépile la navigation de l'onglet d'où l'on vient (router/tabMemory.js) -->
  <v-app-bar flat color="background" density="comfortable" class="back-toolbar">
    <v-btn icon="mdi-arrow-left" variant="text" aria-label="Retour" @click="goBack" />
  </v-app-bar>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { backTarget } from '@/router/tabMemory.js';

const router = useRouter();

const goBack = () => router.push(backTarget());
</script>

<style scoped>
.back-toolbar {
  padding-top: env(safe-area-inset-top);
}
</style>
