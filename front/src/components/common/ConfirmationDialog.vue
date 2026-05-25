<template>
  <v-dialog v-model="modelValue" max-width="400" :z-index="2600">
    <v-card class="pa-6 rounded-xxl">
      <v-card-item class="text-start ma-0 pa-0">
        <v-icon v-if="props.icon" :icon="props.icon" size="36" :color="props.iconColor" class="mb-4" />
        <v-card-title class="text-h6 mb-4">
          {{ props.title }}
        </v-card-title>
      </v-card-item>

      <v-card-text class="text-body-2 pb-6 pa-0">
        {{ props.text }}
      </v-card-text>

      <div class="d-flex align-center justify-end ga-2">
        <v-btn color="primary" variant="text" flat class="custom-btn" @click="handleCancel">
          {{ props.cancelText }}
        </v-btn>
        <slot name="actions">
          <v-spacer />
          <v-btn :color="props.confirmColor" slim :disabled="props.isConfirmDisabled" @click="handleConfirm">
            {{ props.confirmText }}
          </v-btn>
        </slot>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup
        lang="ts">
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
.rounded-xxl {
  border-radius: 28px !important;
}

.custom-btn {
  border: 1px solid rgba(185, 185, 185, 0.3) !important;
}
</style>