<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '',
  },
  confirmText: {
    type: String,
    default: 'Confirmer',
  },
  cancelText: {
    type: String,
    default: 'Annuler',
  },
  isConfirmDisabled: {
    type: Boolean,
    default: false,
  },
  iconColor: {
    type: String,
    default: 'primary',
  },
  confirmColor: {
    type: String,

  },  
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const handleConfirm = () => {
  emit('confirm');
  emit('update:modelValue', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:modelValue', false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="400"
    :z-index="2600"
    :style="{zIndex: 2600 }"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card
      class="pa-6 rounded-xxl"
    >
      <v-card-item class="text-start ma-0 pa-0">
        <v-icon
          v-if="icon"
          :icon="icon"
          size="36"
          :color="iconColor"
          class="mb-4"
        />
        <v-card-title
          v-if="title"
          class="text-h6 mb-4"
        >
          {{ title }}
        </v-card-title>
      </v-card-item>
      <v-card-text
        v-if="text"
        class="text-body-2 pb-6 pa-0"
      >
        {{ text }}
      </v-card-text>
      <div class="d-flex align-center justify-end ga-2">
        <v-btn color="primary" variant="text" flat  class="custom-btn" @click="handleCancel">
          {{ cancelText }}
        </v-btn>
        <slot name="actions">
       
        <v-spacer />
        <v-btn
          :color="confirmColor || 'primary'"
          :slim="true"
          :disabled="isConfirmDisabled"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </v-btn>
      </slot>
      </div>
    </v-card>
  </v-dialog>
</template>

<style>
.rounded-xxl {
  border-radius: 28px !important;
}

.custom-btn {
  border: 1px solid rgba(185, 185, 185, 0.3) !important;
}
</style> 