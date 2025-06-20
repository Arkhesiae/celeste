<script setup>
import { computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'vue-router';

const router = useRouter();
const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();
const authStore = useAuthStore();
const props = defineProps({
  date: {
    type: Date,
    required: true
  },
  text: { type: String },
});

const type = ref('');

const isTrueSwitch = computed(() => {
  if (substitutionStore.hasOwnPendingTrueSwitches(props.date.toISOString())) {
    return true;
  }
  return false;
});

const isTrueSubstitution = computed(() => {
  if (substitutionStore.hasOwnPendingTrueSubstitutions(props.date.toISOString())) {
    return true;
  }
  return false;
});

const isHybridSubstitution = computed(() => {
  if (substitutionStore.hasOwnPendingHybridSubstitutions(props.date.toISOString())) {
    return true;
  }
  return false;
});

const hasMultiplePending = computed(() => {
  const pendingCount = [
    isTrueSwitch.value,
    isTrueSubstitution.value,
    isHybridSubstitution.value
  ].filter(Boolean).length;
  
  return pendingCount >= 2;
});

</script>

<template>

    <v-chip
      @click="router.push(`/exchange/replace`)"
      rounded="lg"
      color="background"
      variant="flat"
      size="x-small"
      style="border-color: rgba(var(--v-theme-remplacement), 0.4);"
      class="text-caption font-weight-bold position-absolute px-2 overflow-visible"
    >
    <div class="mr-2">

  
      <v-icon color="error"  v-if="hasMultiplePending">mdi-alert-circle-outline</v-icon>
      <v-icon color="pendingDemand"  v-if="isTrueSwitch">mdi-swap-horizontal-hidden</v-icon>
      <v-icon color="pendingDemand"  v-if="isTrueSubstitution">mdi-account-arrow-left</v-icon>
      <v-icon color="pendingDemand"  v-if="isHybridSubstitution">mdi-account-arrow-left</v-icon>
      <v-icon color="pendingDemand"  class="ml-n2" style="top: 1px; font-size: 16px;" v-if="isHybridSubstitution">mdi-swap-horizontal</v-icon>
    </div>
      <span v-if="isTrueSwitch">Demande de permutation</span>
      <span v-if="isTrueSubstitution">Demande de remplacement</span>
      <span v-if="isHybridSubstitution">Demande en cours</span>

      <v-icon >mdi-chevron-right</v-icon>
    </v-chip>

</template>
