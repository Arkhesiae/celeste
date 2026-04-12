<template>
  <!-- Carte de l'équipe -->
  <v-card ref="teamCard" rounded="xl" elevation="0" class="pa-2 team-card">
    <div class="d-flex align-start justify-space-between">
      <v-card-title class="text-body-1 font-weight-bold">
        Mon équipe
      </v-card-title>
      <v-icon icon="mdi-crowd" size="16" color="onBackground"
        style="position: absolute; bottom: 40px; left: 16px; transform: scale(12); filter: blur(0px); z-index: -1; opacity: 0.10;" />

      <div v-if="teamStore.currentTeam" class="d-flex flex-column align-end pa-2">
        <div class="d-flex align-center flex-column justify-space-between ga-2">
          <v-avatar color="background" size="48" class=" smooth-shadow">
            <v-icon icon="mdi-crowd" size="24" />
          </v-avatar>
          <div class="text-h7 font-weight-bold ">
            Equipe {{ teamStore.currentTeam.name }}
          </div>
        </div>
      </div>
      <div v-else class="text-center text-medium-emphasis">
        Aucune équipe assignée
      </div>
    </div>
  </v-card>
</template>

<script setup>
import { useTeamStore } from '@/stores/teamStore.js';

const teamStore = useTeamStore();
</script>

<style scoped>
.team-card.not-visible {
  opacity: 0.01;
  transition: all 0.3s ease-in-out;
  transform: translateY(20px) scale(0.90);
}

.team-card {
  opacity: 1;
  transition: all 0.5s ease-in-out .2s;
  transform: translateY(0px) scale(1);
}
</style>
