<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useRouter } from 'vue-router';

const router = useRouter();
// const teamStore = useTeamStore();
const substitutionStore = useSubstitutionStore();
// const authStore = useAuthStore();
const props = defineProps({
  date: {
    type: Date,
    required: true
  },
  text: { type: String },
});

// const type = ref('');

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
    rounded="lg"
    color="background"
    variant="flat"
    size="x-small"
    style="border-color: rgba(var(--v-theme-remplacement), 0.4);"
    class="text-caption font-weight-bold px-2 overflow-visible"
    @click="router.push(`/exchange/replace`)"
  >
    <div class="mr-2">
      <v-icon
        v-if="hasMultiplePending"
        color="error"
      >
        mdi-alert-circle-outline
      </v-icon>
      <v-icon
        v-if="isTrueSwitch"
        color="pendingDemand"
      >
        mdi-swap-horizontal-hidden
      </v-icon>
      <v-icon
        v-if="isTrueSubstitution"
        color="pendingDemand"
      >
        mdi-account-arrow-left
      </v-icon>
      <v-icon
        v-if="isHybridSubstitution"
        color="pendingDemand"
      >
        mdi-account-arrow-left
      </v-icon>
      <v-icon
        v-if="isHybridSubstitution"
        color="pendingDemand"
        class="ml-n2"
        style="top: 1px; font-size: 16px;"
      >
        mdi-swap-horizontal
      </v-icon>
    </div>
    <span v-if="isTrueSwitch">Demande de permutation</span>
    <span v-if="isTrueSubstitution">Demande de remplacement</span>
    <span v-if="isHybridSubstitution">Demande en cours</span>

    <v-icon>mdi-chevron-right</v-icon>
  </v-chip>
</template>
