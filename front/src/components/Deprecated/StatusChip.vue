<!-- <script setup>

import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
// import { useAuthStore } from '@/stores/authStore';

const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();
// const authStore = useAuthStore();
const props = defineProps({
  date: { type: String, required: true },
  text: { type: String, default: '' },
  status: { type: String, required: true },
});

// const type = ref('');  


const substitutionTeam = computed(() => {
  if (props.status === 'accepted-accepter') {
    const substitution = substitutionStore.hasAcceptedSubstitutionsAsAccepter(props.date);
    return teamStore.centerTeams.find(t => t._id === substitution?.posterShift.teamId)?.name || '';
  }
  return '';
});


const isPureSwitch = computed(() => {
  if (substitutionStore.hasOwnPendingPureSwitches(props.date)) {
    return true;
  }
  return false;
});

const isPureSubstitution = computed(() => {
  if (substitutionStore.hasOwnPendingPureSubstitutions(props.date)) {
    return true;
  }
  return false;
});

const isHybridSubstitution = computed(() => {
  if (substitutionStore.hasOwnPendingHybridSubstitutions(props.date)) {
    return true;
  }
  return false;
});

const hasMultiplePending = computed(() => {
  const pendingCount = [
    isPureSwitch.value,
    isPureSubstitution.value,
    isHybridSubstitution.value
  ].filter(Boolean).length;

  return pendingCount >= 2;
});


</script>

<template>
  <v-chip
v-if="status !== ''" rounded="lg" :color="status === 'pending' ? 'surfaceContainer' : 'remplacement'"
    :variant="status !== 'pending' ? 'flat' : 'flat'" size="x-small"
    style="bottom: -10px; opacity: 1; transform: scale(0.9) ; border-color: rgba(var(--v-theme-primary), 0.4);"
    class="text-caption font-weight-bold position-absolute px-2 overflow-visible">
    <v-icon v-if="hasMultiplePending" :color="status === 'pending' ? 'remplacement' : 'background'">
      mdi-alert-circle-outline
    </v-icon>
    <v-icon v-else-if="isPureSwitch" :color="status === 'pending' ? 'remplacement' : 'background'">
      mdi-swap-horizontal-hidden
    </v-icon>
    <v-icon
v-else-if="isPureSubstitution || isHybridSubstitution"
      :color="status === 'pending' ? 'remplacement' : 'background'">
      mdi-account-arrow-left
    </v-icon>
    <div
v-if="status === 'pending' && isHybridSubstitution" class="d-flex justify-center align-center"
      style="position: absolute; top: 1px; right: -14px; height: 16px; width: 16px; background-color: rgba(var(--v-theme-permutation), 0.4); border-radius: 50%;">
      <v-icon size="small" class="" color="permutation">
        mdi-plus
      </v-icon>
    </div>
    <div v-if="text">
      <span>{{ text }}</span>
    </div>
    <div v-else>
      <span v-if="status === 'accepted'">{{ 'OK' }}</span>
      <span v-if="status === 'accepted-poster'">{{ 'OK' }}</span>
      <span v-if="status === 'accepted-accepter'">{{ substitutionTeam }}</span>
      <span v-if="status === 'pending'">{{ '?' }}</span>
    </div>
  </v-chip>
</template> -->
