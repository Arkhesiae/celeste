<template>
  <v-snackbar-queue v-model="snackbarStore.messageQueue" color="onBackground" :timeout="3000" location="top"
    height="64px" rounded="xl">
    <template #text="{item}">
      <div class="d-flex align-center">
        <v-icon :icon="item.icon" :color="item.iconColor" class="me-2" />
        {{ item.message }}
      </div>
    </template>
  </v-snackbar-queue>
</template>

<script setup>
import { useSnackbarStore } from '@/stores/snackbarStore';

const snackbarStore = useSnackbarStore();
</script> 