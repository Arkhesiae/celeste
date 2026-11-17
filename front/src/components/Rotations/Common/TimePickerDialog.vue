<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'update:time', 'save', 'close']);

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const localTime = computed({
  get: () => props.time,
  set: (value) => emit('update:time', value),
});

const closeTimePicker = () => {
  emit('close');
};

const saveTimePicker = () => {
  emit('save');
};
</script>

<template>
  <BaseDialog
    v-model="localDialogVisible"
    persistent
    :title="type === 'startTime' ? 'Heure de début' : 'Heure de fin'"
    :max-width="500"
  >
    <p class="text-medium-emphasis text-body-medium mb-4">Sélectionnez l'heure pour cette vacation</p>
    <div class="d-flex justify-center">
      <v-time-picker
        v-model="localTime"
        color="primary"
        bg-color="transparent"
        format="24hr"
        scrollable
        title=""
        locale="fr"
        rounded="xl"
        :allowed-minutes="[0, 30, 15, 45]"
        elevation="0"
        width="100%"
      />
    </div>

    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="closeTimePicker">Annuler</v-btn>
      <v-btn @click="saveTimePicker">Enregistrer</v-btn>
    </template>
  </BaseDialog>
</template>

<style scoped>
:deep(.v-time-picker-clock) {
  background: rgba(var(--v-theme-background), 1) !important;
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.05);
}
</style>
