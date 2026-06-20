<template>
  <v-dialog
    v-model="modelValue"
    :persistent="persistent"
    :max-width="maxWidth"
    :min-width="minWidth"
    class="base-dialog"
  >
    <v-card class="base-dialog__card" :class="{ 'base-dialog__card--centered': hasIcon }">
      <v-card-item class="base-dialog__header">
        <template v-if="hasIcon" >
          <v-icon size="24">{{icon}}</v-icon>
        </template>

        <v-card-title name="title">{{ title }}</v-card-title>
      
      </v-card-item>

      <v-card-text class="base-dialog__body">
        <slot />
      </v-card-text>

      <v-divider v-if="divider" class="base-dialog__divider" />

      <v-card-actions v-if="$slots.actions" class="base-dialog__actions">
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

interface Props {
  title?: string;
  icon?: string | null;
  maxWidth?: number | string;
  minWidth?: number | string;
  persistent?: boolean;
  divider?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  icon: null,
  maxWidth: 560,
  minWidth: 280,
  persistent: false,
  divider: false,
});

const modelValue = defineModel<boolean>({ default: false });

const slots = useSlots();
const hasIcon = computed(() => !!props.icon || !!slots.icon);
</script>

<style scoped>
.base-dialog__card {
  border-radius: 28px !important;
}

/* Header: icon + title row, MD3 = 24px top/left/right, 16px to icon-title gap */
.base-dialog__header {
  padding: 24px 24px 0 !important;
}

.base-dialog__card--centered .base-dialog__header {
  justify-content: center !important;
  text-align: center !important;
}

.base-dialog__card--centered .base-dialog__header :deep(.v-card-item__content) {
  gap:16px !important;
  flex-direction: column;
  align-items: center;
  display: flex !important;

}

/* Title → body gap: 16px */
.base-dialog__header + .base-dialog__body {
  padding-top: 16px !important;
}

/* Body: 16px top, 24px sides, 24px bottom (to actions) */
.base-dialog__body {
  padding: 16px 24px 24px !important;
}

.base-dialog__divider {
  margin: 0 !important;
}

/* Actions: 24px sides/bottom, 8px between buttons */
.base-dialog__actions {
  padding: 0 24px 24px  !important;
  gap: 8px !important;
}

/* If no actions slot is used, body owns the bottom 24px instead */
.base-dialog__card:not(:has(.base-dialog__actions)) .base-dialog__body {
  padding-bottom: 24px !important;
}
</style>