<template>
  <v-bottom-sheet
    :model-value="modelValue"
    inset
    @update:model-value="emit('update:modelValue', $event)"
    class="safe-area-bottom"
  >
    <CalendarPanel
      :formatted-date="formattedDate"
      :selected-date="selectedDate"
      :show-chips="true"
      @open-rempla-dialog="handleOpenRemplaDialog"
      @open-drawer="handleOpenDrawer"
      @cancel="emit('cancel', $event)"
      @withdraw="emit('withdraw', $event)"
    />
  </v-bottom-sheet>
</template>

<script setup>
const emit = defineEmits(['update:modelValue', 'openRemplaDialog', 'openDrawer', 'cancel', 'withdraw']);

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

const handleOpenRemplaDialog = (type) => {
  emit('openRemplaDialog', type);
};

const handleOpenDrawer = (type) => {
  emit('openDrawer', type);
};

</script>

<style scoped>


</style>
