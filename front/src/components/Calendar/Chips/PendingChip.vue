<script setup>
import { computed, onMounted } from 'vue';
import { useTeamStore } from '@/stores/teamStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useAuthStore } from '@/stores/authStore';

const substitutionStore = useSubstitutionStore();
const props = defineProps({
  date : { type: Date, required: true },
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
 
      rounded="lg"
      color="background"
      variant="flat"
      size="x-small"
      style="bottom: -10px; opacity: 1; transform: scale(1) ; border-color: rgba(var(--v-theme-remplacement), 0.4);"
      class="text-caption font-weight-bold position-absolute px-2 overflow-visible"
    >
      <v-icon color="error"  v-if="hasMultiplePending">mdi-alert-circle-outline</v-icon>
      <v-icon color="permutation"  v-if="isTrueSwitch">mdi-swap-horizontal-hidden</v-icon>
      <v-icon color="remplacement"  v-if="isTrueSubstitution">mdi-account-arrow-left</v-icon>
      <v-icon color="remplacement"  v-if="isHybridSubstitution">mdi-account-arrow-left</v-icon>
      <v-icon color="permutation"  v-if="isHybridSubstitution">mdi-swap-horizontal</v-icon>

      <div v-if="text" >
        <span>{{text}}</span>
      </div>
      <div  v-else>
       
        <span >?</span>
      </div>
    </v-chip>

</template>
