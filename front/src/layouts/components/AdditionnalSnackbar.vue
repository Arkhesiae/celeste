<template>
  <v-snackbar v-model="snackbarStore.additionalMessageQueue" color="onBackground" :timeout="3000" location="bottom left"
    height="48px" rounded="lg" class="additional-snackbar">
    <template #text="{item}">
      <div class="d-flex align-center">
        <v-icon :icon="item.icon" :color="item.iconColor" class="me-2" />
        {{ item.message }}
      </div>
    </template>
  </v-snackbar>
</template>

<script setup>
import { useSnackbarStore } from '@/stores/snackbarStore';

const snackbarStore = useSnackbarStore();
</script> 

<style scoped>
.additional-snackbar {
  z-index: 2300 !important;
}
</style>