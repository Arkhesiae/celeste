<script setup lang="ts">
interface Props {
  isDialogVisible: boolean;
  errorMessage?: string;
  errorIcon?: string;
  errorTitle?: string;
  errorDescription?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'onClose'): void;
  (e: 'onSubmit'): void;
  (e: 'update:dialogModeValue', value: any): void;
  (e: 'update:dialogVisible', value: boolean): void;
}>();

const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:dialogVisible', value),
});

const closeDialog = () => {
  localDialogVisible.value = false;
};
</script>

<template>
  <BaseDialog v-model="localDialogVisible" persistent :icon="errorIcon" :title="errorTitle" :max-width="500">
    <p class="text-title-small text-medium-emphasis">{{ errorMessage }}</p>

    <template #actions>
      <v-spacer />
      <v-btn color="primary" @click="closeDialog">Fermer</v-btn>
    </template>
  </BaseDialog>
</template>

<style scoped></style>
