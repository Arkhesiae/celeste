<template>
  <v-col :cols="cols" class="mt-2" style="min-width: 200px">
    <CalendarPanel
      :formatted-date="formattedDate"
      :vacations-of-user="vacationsOfUser"
      :selected-date="selectedDate"
      :show-chips="true"
      @open-rempla-dialog="handleOpenRemplaDialog"
      @open-substitutions-drawer="handleOpenSubstitutionsDrawer"
      @open-switches-drawer="handleOpenSwitchesDrawer"
      @cancel-demand="handleCancelDemand"
      @unaccept-demand="handleUnacceptDemand"
    />
  </v-col>
</template>

<script setup>
import { computed } from 'vue';
import CalendarPanel from './CalendarPanel.vue';

const emit = defineEmits(['openRemplaDialog', 'openSubstitutionsDrawer', 'openSwitchesDrawer', 'cancelDemand', 'unacceptDemand']);

const props = defineProps({
  cols: {
    type: Number,
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

const handleUnacceptDemand = (substitutionId) => {
  emit('unacceptDemand', substitutionId);
};
</script>

