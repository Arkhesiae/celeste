<script setup>
const modelValue = defineModel({ type: Boolean, required: true });
const time = defineModel('time', { type: String, default: '' });

defineProps({
  type: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['save', 'close']);

const closeTimePicker = () => {
  emit('close');
};

const saveTimePicker = () => {
  emit('save');
};
</script>

<template>
  <BaseDialog
    v-model="modelValue"
    persistent
    :title="type === 'startTime' ? 'Heure de début' : 'Heure de fin'"
    :max-width="500"
  >
    <p class="text-medium-emphasis text-body-medium mb-4">Sélectionnez l'heure pour cette vacation</p>
    <div class="d-flex justify-center">
      <v-time-picker
        v-model="time"
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
  border: 1px solid rgba(var(--v-theme-surfaceVariant), 0.05);
}
</style>
