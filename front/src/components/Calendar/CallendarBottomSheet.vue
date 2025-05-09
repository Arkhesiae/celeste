<template>
  <v-bottom-sheet v-model="localModelValue" order="-4">
    <CalendarPanel
      :formatted-date="formattedDate"
      :vacations-of-user="vacationsOfUser"
      :selected-date="selectedDate"
      :show-chips="true"
      @open-rempla-dialog="handleOpenRemplaDialog"
      @open-substitutions-drawer="handleOpenSubstitutionsDrawer"
      @open-switches-drawer="handleOpenSwitchesDrawer"
      @cancel-demand="handleCancelDemand"
    />
  </v-bottom-sheet>

  <AvailableSubstitutionsDrawer v-model="showSubstitutionsDrawer" :selectedDate="selectedDate" />
  <AvailableSwitchesDrawer v-model="showSwitchesDrawer" :selectedDate="selectedDate" />
</template>

<script setup>
import { computed, ref } from 'vue';
import AvailableSubstitutionsDrawer from './AvailableSubstitutionsDrawer.vue';
import AvailableSwitchesDrawer from './AvailableSwitchesDrawer.vue';
import CalendarPanel from './CalendarPanel.vue';

const emit = defineEmits(['update:modelValue', 'openRemplaDialog', 'openSubstitutionsDrawer', 'openSwitchesDrawer', 'cancelDemand']);

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  formattedDate: {
    type: String,
    required: true
  },
  vacationsOfUser: {
    type: Map,
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

const getVacation = computed(() => {
  if (!props.selectedDate) return null;
  return props.vacationsOfUser.get(new Date(props.selectedDate).toISOString());
});

const isRestDay = computed(() => {
  return getVacation.value?.shift?.type === 'rest';
});

const getShiftName = computed(() => {
  return getVacation.value?.shift?.name || '';
});

const getShiftHours = computed(() => {
  return {
    startTime: getVacation.value?.shift?.startTime || '',
    endTime: getVacation.value?.shift?.endTime || ''
  };
});

const getShiftTeam = computed(() => {
  return getVacation.value?.teamObject?.name || '';
});

const handleOpenRemplaDialog = (type) => {
  emit('openRemplaDialog', type);
};

const handleOpenSubstitutionsDrawer = () => {
  emit('openSubstitutionsDrawer');
};

const handleOpenSwitchesDrawer = () => {
  emit('openSwitchesDrawer');
};


const handleCancelDemand = (substitutionId) => {
  emit('cancelDemand', substitutionId);
};
</script>

<style scoped>
.v-bottom-sheet {
  border-radius: 16px 16px 0 0;
}
</style>
