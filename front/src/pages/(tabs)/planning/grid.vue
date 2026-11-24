<template>
  <v-container class="pb-8">
    <MainTitle
      :title="header.teamName ? `Grille · ${header.teamName}` : 'Grille'"
      :subtitle="header.rangeLabel"
      back-button
    />

    <TeamGridView :center-id="centerId" :team-id="initialTeamId" :span="initialSpan" @change="onChange" />
  </v-container>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// Le centre est dans la requête (?center=) ; sans lui, celui de l'utilisateur
const centerId = (typeof route.query.center === 'string' && route.query.center) || authStore.userData.centerId;
const initialTeamId = typeof route.query.team === 'string' ? route.query.team : null;
const initialSpan = Number(route.query.span) || undefined;

const header = reactive({ teamName: '', rangeLabel: '' });

// L'équipe et la durée choisies restent dans l'adresse, pour pouvoir la partager
const onChange = ({ teamName, rangeLabel, teamId, span }) => {
  header.teamName = teamName;
  header.rangeLabel = rangeLabel;
  const query = { ...route.query, ...(teamId ? { team: teamId } : {}), span: String(span) };
  if (query.team !== route.query.team || query.span !== route.query.span) router.replace({ query });
};
</script>
