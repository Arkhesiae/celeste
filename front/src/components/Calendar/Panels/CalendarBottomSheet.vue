<template>
  <v-bottom-sheet v-model="localModelValue" inset class="safe-area-bottom">
    <CalendarPanel
      :formatted-date="formattedDate"
      :selected-date="selectedDate"
      :show-chips="true"
      @open-rempla-dialog="handleOpenRemplaDialog"
      @open-drawer="handleOpenDrawer"
      @cancel-demand="handleCancelDemand"
      @unaccept-demand="handleUnacceptDemand"
    />
  </v-bottom-sheet>

</template>

<script setup>
import { computed, ref } from 'vue';
import CalendarPanel from './common/CalendarPanel.vue';

const emit = defineEmits(['update:modelValue', 'openRemplaDialog', 'openDrawer', 'cancelDemand', 'unacceptDemand']);

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  formattedDate: {
    type: String,
    required: true
  },

  selectedDate: {
    type: [Date, String, null],
    required: true
  }
});

// États pour les tiroirs
const showSubstitutionsDrawer = ref(false);
const showSwitchesDrawer = ref(false);

// Création d'une valeur locale pour suivre l'état du modèle
const localModelValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});


const handleOpenRemplaDialog = (type) => {
  emit('openRemplaDialog', type);
};

const handleOpenDrawer = (type) => {
  emit('openDrawer', type);
};

const handleCancelDemand = (substitutionId) => {
  emit('cancelDemand', substitutionId);
};

const handleUnacceptDemand = (substitutionId) => {
  emit('unacceptDemand', substitutionId);
};
</script>

<style scoped>


</style>
