<template>
  <v-bottom-sheet v-model="localModelValue" order="-4">
    <CalendarPanel
      :formatted-date="formattedDate"
      :vacations-of-user="vacationsOfUser"
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
.v-bottom-sheet {
  border-radius: 16px 16px 0 0;
}
</style>
