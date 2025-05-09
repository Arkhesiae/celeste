<script setup lang="ts">
import { computed } from 'vue';
import { useDisplay } from "vuetify";

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

const { mobile } = useDisplay();

const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:dialogVisible', value),
});

const closeDialog = () => {
  localDialogVisible.value = false;
};
</script>

<template>
  <v-dialog v-model="localDialogVisible" persistent class="d-flex" max-width="500px">
    <v-card rounded="xl" class="pa-4">
      <v-card-item class="text-error d-flex align-center justify-center"
                   :class="{'flex-column' : mobile}">
        <template #prepend>
          <v-icon :size="mobile ? 'x-large' : 'large'" :class="{'mb-4' : mobile}" :icon="errorIcon"></v-icon>
        </template>

        <v-card-title class="text-h6 text-onBackground text-wrap"
                      :class="{'text-center' : mobile, 'ml-4' : !mobile}">
          {{ errorTitle }}
        </v-card-title>
      </v-card-item>

      <v-card-text class="ml-0 mt-4 align-center d-flex"
                   :class="{'justify-center' : mobile}">
        <p class="text-subtitle-2 text-medium-emphasis">{{ errorMessage }}</p>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="closeDialog">Fermer</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>

</style>
