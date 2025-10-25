<template>
  <v-snackbar-queue content-class="adjustedMarginSnackbar "  v-model="snackbarStore.messageQueue" color="onBackground" :timeout="30000" location="top"
    height="48px" rounded="xl"  >
    <template #text="{item}" >
      <div class="d-flex align-center ga-1">
        <!-- <v-icon :icon="item.icon" :color="item.iconColor" class="" /> -->
        <span class="text-subtitle-2 small-text " style="font-size: 0.70rem !important;">{{ item.message }}</span>
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



</script> 

<style >
.adjustedMarginSnackbar{
  margin-top: calc(var(--safe-area-top,0px) + 0px) !important;
  /* padding-top: 100px !important; */
}
.small-text {
  font-size: 0.75rem !important;
}


.error::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background:  linear-gradient(135deg, rgba(var(--v-theme-error), 0.8), rgba(var(--v-theme-onError), 0.8)) !important;
  border-radius: 10px;
}

.error::after {
  content: '';
  position: absolute;
  top: 2px;
  border-radius: 100px;
  left: 2px;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  background:  linear-gradient(135deg, rgba(var(--v-theme-onBackground), 0), rgba(var(--v-theme-onBackground), 0)) !important;
 
}
</style>