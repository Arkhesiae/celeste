<script setup lang="ts">
interface Props {
  errorMessage?: string;
  errorIcon?: string;
  errorTitle?: string;
  errorDescription?: string;
}

const modelValue = defineModel<boolean>({ required: true });
defineProps<Props>();

const closeDialog = () => {
  modelValue.value = false;
};
</script>

<template>
  <BaseDialog v-model="modelValue" persistent :icon="errorIcon" :title="errorTitle" :max-width="500">
    <p class="text-title-small text-medium-emphasis">{{ errorMessage }}</p>

    <template #actions>
      <v-spacer />
      <v-btn color="primary" @click="closeDialog">Fermer</v-btn>
    </template>
  </BaseDialog>
</template>

<style scoped></style>
