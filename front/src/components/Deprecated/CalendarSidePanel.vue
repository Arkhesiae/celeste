<template>
    <CalendarPanel
      :formatted-date="formattedDate"
      :selected-date="selectedDate"
      :show-chips="true"
      @open-rempla-dialog="handleOpenRemplaDialog"
      @open-drawer="handleOpenDrawer"
      @cancel="emit('cancel', $event)"
      @withdraw="emit('withdraw', $event)"
    />
</template>

<script setup>


const emit = defineEmits(['openRemplaDialog', 'openDrawer', 'cancel', 'withdraw']);

defineProps({
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



</script>

