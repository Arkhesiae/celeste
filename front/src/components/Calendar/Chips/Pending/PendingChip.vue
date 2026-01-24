<script setup>
import { computed } from 'vue';
import { useSubstitutionStore } from '@/stores/substitutionStore';

const substitutionStore = useSubstitutionStore();
const props = defineProps({
  date : { type: Date, required: true },
  text: { type: String },

});



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
    color="surface"
    variant="flat"
    size="x-small"
    style="bottom: -10px; opacity: 1; transform: scale(1) ; border-color: rgba(var(--v-theme-primary), 0.4);"
    class="position-absolute"
  >
    <v-icon
      v-if="hasMultiplePending"
      color="error"
    >
      mdi-alert-circle-outline
    </v-icon>
    <v-icon
      v-if="isTrueSwitch"
      size="small"
      color="onBackground"
    >
      mdi-swap-horizontal-hidden
    </v-icon>
    <v-icon
      v-if="isTrueSubstitution || isHybridSubstitution"
      size="small"
      color="onBackground"
    >
      mdi-account-arrow-left
    </v-icon>
    <v-icon
      v-if="isHybridSubstitution"
      size="small"
      color="onBackground"
      class="ml-n2"
      style="top: 1px; font-size: 16px;"
    >
      mdi-swap-horizontal
    </v-icon>

    <div v-if="text">
      <span>{{ text }}</span>
    </div>
    <div v-else>
      <span>?</span>
    </div>
  </v-chip>
</template>
