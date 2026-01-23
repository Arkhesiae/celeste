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

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const { smAndDown } = useDisplay();

const submit = () => {
  emit('submit');
  emit('update:modelValue', false);
};

const close = () => {
  emit('cancel');
  emit('update:modelValue', false);
};
</script>

<template>
  <v-dialog 
    :model-value="isDialogVisible" 
    :max-width="maxWidth" 
    :fullscreen="fullscreen || smAndDown"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card
      :class="smAndDown ? '' : 'rounded-xxl'"
      elevation="0"
      class="pa-0 pt-0 "
    >
      <div class="bar py-2 px-2 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <div v-if="showCloseButton && smAndDown">
            <v-btn
              icon="mdi-arrow-left"
              variant="text"
              @click="close"
            />
          </div>
          <v-card-title>{{ title }}</v-card-title>
        </div>


        <div v-if="!smAndDown && showCloseButton">
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="close"
          />
        </div>
      </div>

      <v-card-text class="px-6">
        <slot />
      </v-card-text>

      <v-card-actions
        v-if="showActions"
        class="pa-6"
      >
        <v-btn
          v-if="showSecondaryAction"
          color="primary"
          variant="text"
          rounded="xl"
          :slim="true"
          @click="close"
        >
          {{ secondaryActionText }}
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="tonal"
          :slim="true"
          rounded="xl"
          :disabled="isPrimaryActionDisabled"
          @click="submit"
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

.rounded-xxl {
  border-radius: 28px !important;
}

.bar {
  position: sticky;
  width: 100%;
  min-height: 64px;
  z-index: 1000;
  background-color: rgba(var(--v-theme-surface), 1);
  top: 0;
}
</style> 