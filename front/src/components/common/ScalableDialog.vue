<script setup>
import { ref, computed } from 'vue';
import { useDisplay } from 'vuetify';

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  showCloseButton: {
    type: Boolean,
    default: true,
  },
  maxWidth: {
    type: String,
    default: '900',
  },
  fullscreen: {
    type: Boolean,
    default: false,
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  primaryActionText: {
    type: String,
    default: 'Enregistrer',
  },
  secondaryActionText: {
    type: String,
    default: 'Annuler',
  },
  showSecondaryAction: {
    type: Boolean,
    default: true,
  },
  isPrimaryActionDisabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:dialogVisible', 'submit', 'cancel']);

const { smAndDown } = useDisplay();

const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:dialogVisible', value),
});

const submit = () => {
  emit('submit');
  localDialogVisible.value = false;
};

const close = () => {
  emit('cancel');
  localDialogVisible.value = false;
};
</script>

<template>
  <v-dialog 
    v-model="localDialogVisible" 
    :max-width="maxWidth" 
    :fullscreen="fullscreen || smAndDown"
  >
    <v-card :rounded="smAndDown ? '' : 'xl'" elevation="0" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">{{ title }}</v-card-title>
        <template #append v-if="!smAndDown && showCloseButton">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else-if="showCloseButton">
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="px-6">
        <slot></slot>
      </v-card-text>

      <v-card-actions v-if="showActions" class="pa-6">
        <v-btn
          v-if="showSecondaryAction"
          color="primary"
          variant="text"
          rounded="xl"
          @click="close"
          :slim="false"
          size="large"
        >
          {{ secondaryActionText }}
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          :slim="false"
          rounded="xl"
          @click="submit"
          :disabled="isPrimaryActionDisabled"
          size="large"
        >
          {{ primaryActionText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.v-card {
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.12);
}

.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style> 