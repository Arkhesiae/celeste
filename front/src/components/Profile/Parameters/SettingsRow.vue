<template>
  <!-- Une ligne de réglage : icône, titre, sous-titre et, à la fin, un chevron (ou ce que remplit le slot `append`). Le clic vient du parent. -->
  <v-list-item class="settings-row bg-surfaceContainer" :disabled="disabled">
    <template #prepend>
      <v-icon class="px-3" :icon="icon" size="20" color="primary" />
    </template>

    <v-list-item-title class="text-body-medium">{{ title }}</v-list-item-title>
    <v-list-item-subtitle v-if="subtitle" class="text-body-small" :class="{ 'text-error': error }">
      {{ subtitle }}
    </v-list-item-subtitle>

    <template #append>
      <slot name="append">
        <v-progress-circular v-if="loading" indeterminate size="20" width="2" color="primary" />
        <v-icon v-else icon="mdi-chevron-right" color="primary" />
      </slot>
    </template>
  </v-list-item>
</template>

<script setup>
defineProps({
  icon: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  /** Sous-titre en couleur d'erreur (information manquante) */
  error: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});
</script>
