<template>
  <base-dialog v-model="modelValue" :title="props.title" max-width="400" :z-index="2600" :icon="props.icon">

    {{ props.text }}

    <template #actions>
      <v-btn color="primary" variant="text" flat class="custom-btn" @click="handleCancel">
        {{ props.cancelText }}
      </v-btn>
      <slot name="actions">
        <v-spacer />
        <v-btn :color="props.confirmColor" slim :disabled="props.isConfirmDisabled" @click="handleConfirm">
          {{ props.confirmText }}
        </v-btn>
      </slot>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">

const modelValue = defineModel<boolean>({ default: false })

const props = withDefaults(defineProps<{
  title: string
  text: string
  icon?: string
  confirmText?: string
  cancelText?: string
  isConfirmDisabled?: boolean
  iconColor?: string
  confirmColor?: string
}>(), {
  icon: '',
  confirmText: 'Confirmer',
  cancelText: 'Annuler',
  isConfirmDisabled: false,
  iconColor: 'primary',
  confirmColor: 'primary',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const handleConfirm = (): void => {
  emit('confirm')
  modelValue.value = false
}

const handleCancel = (): void => {
  emit('cancel')
  modelValue.value = false
}
</script>

<style scoped>
.custom-btn {
  border: 1px solid rgba(185, 185, 185, 0.3) !important;
}

:deep(.base-dialog__card--centered .base-dialog__header) {
  justify-content: flex-start;
  text-align: start;
}
</style>