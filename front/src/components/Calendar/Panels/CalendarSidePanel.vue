<template>
  <v-col :cols="cols" class="mt-2" style="min-width: 200px">
    <CalendarPanel
      :formatted-date="formattedDate"
      :selected-date="selectedDate"
      :show-chips="true"
      @open-rempla-dialog="handleOpenRemplaDialog"
      @open-drawer="handleOpenDrawer"
      @cancel-demand="handleCancelDemand"
      @unaccept-demand="handleUnacceptDemand"
      
    />
  </v-col>
</template>

<script setup>
import { computed } from 'vue';
import CalendarPanel from './common/CalendarPanel.vue';

const emit = defineEmits(['openRemplaDialog', 'openDrawer', 'cancelDemand', 'unacceptDemand']);

const props = defineProps({
  cols: {
    type: Number,
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

