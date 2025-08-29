<template>
  <v-snackbar-queue content-class="adjustedMarginSnackbar"  v-model="snackbarStore.messageQueue" color="onBackground" :timeout="3000" location="top"
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
const safeAreaTop = computed(() => {
  return getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top').replace('px', '')
})
console.log(safeAreaTop.value)


</script> 

<style >
.adjustedMarginSnackbar{
  margin-top: calc(var(--safe-area-top,0px) + 0px) !important;
  /* padding-top: 100px !important; */
}
</style>