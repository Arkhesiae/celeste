<script setup>
import { computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useAuthStore } from '@/stores/authStore';

const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();
const authStore = useAuthStore();
const props = defineProps({
  type: { type: String, required: true },
  date : { type: String, required: true },
  text: { type: String },
  status: { type: String, required: true },
});


const substitutionTeam = computed(() => {
  if (props.status === 'accepted-accepter') {
    const substitution = substitutionStore.hasAcceptedSubstitutionsAsAccepter(props.date);  
    return teamStore.centerTeams.find(t => t._id === substitution?.posterShift.teamId)?.name || '';
  }
  return '';
});




</script>

<template>

    <v-chip
    v-if="status !== ''"
      rounded="lg"
      :color="status === 'accepted-accepter' ? 'remplacement' : 'remplacement'"
      :variant="status !== 'pending' ? 'flat' : 'outlined'"
      size="x-small"
      style="bottom: -10px; opacity: 1; transform: scale(0.9) ; border-color: rgba(var(--v-theme-remplacement), 0.4);"
      class="text-caption font-weight-bold position-absolute px-2 overflow-visible"
    >
      <v-icon>{{ type === "switch" ?  "mdi-swap-horizontal-hidden" : "mdi-account-arrow-left" }}</v-icon>
      <v-icon size="small" class="position-absolute" style="top: -7px; right: -7px; " color="permutation">mdi-plus-circle-outline</v-icon>
      <div v-if="text">
        <span>{{text}}</span>
      </div>
      <div v-else>
        <span v-if="status==='accepted'">{{ 'OK' }}</span>
        <span v-if="status==='accepted-poster'">{{ 'OK' }}</span>
        <span v-if="status==='accepted-accepter'">{{ substitutionTeam }}</span>
        <span v-if="status==='pending'">{{ '?' }}</span>
      </div>
    </v-chip>

</template>
