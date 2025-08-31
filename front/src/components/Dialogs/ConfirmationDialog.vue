<script setup>
const props = defineProps({
  isDialogVisible: {
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

const emit = defineEmits(['update:isDialogVisible', 'confirm', 'cancel']);

const handleConfirm = () => {
  emit('confirm');
  emit('update:isDialogVisible', false);
};

const handleCancel = () => {
  emit('cancel');
  emit('update:isDialogVisible', false);
};
</script>

<template>
  <v-dialog
    :model-value="isDialogVisible"
    @update:model-value="$emit('update:modelValue', $event)"
    max-width="400"
  >
    <v-card rounded="xl" class="pa-6">
      <v-card-item  class="text-center ma-0 pa-0">
        <v-icon
          v-if="icon"
          :icon="icon"
          size="36"
          :color="iconColor"
          class="mb-4"
        />
        <v-card-title v-if="title" class="text-h6 mb-4">{{ title }}</v-card-title> 
       
      </v-card-item>
      <v-card-text v-if="text" class="text-body-2 pb-6 pa-0">
          {{ text }}
        </v-card-text>
      <v-card-actions class="pa-0 ">
        
        <v-btn
          color="secondary"
          variant="outlined"         
          :slim="true"  
          @click="handleCancel"
          class="border-white"
        >
          {{ cancelText }}
        </v-btn>
        <v-spacer />
        <v-btn
          :color="confirmColor || 'primary'"
          :slim="true"
          :disabled="isConfirmDisabled"
          @click="handleConfirm"
          
        >
          {{ confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>


.border-white {
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}
</style> 