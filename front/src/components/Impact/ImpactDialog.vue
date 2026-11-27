<template>
  <GenericDialog
    v-model="modelValue"
    :title="title"
    :max-width="maxWidth"
    persistent
    retain-focus
    @close="emit('cancel')"
  >
    <template #content>
      <div class="d-flex flex-column ga-4">
        <v-alert :type="alertType" :icon="alertIcon" rounded="xl">
          <slot name="alert" />
        </v-alert>
        <slot />
      </div>
    </template>
    <template #footer>
      <v-btn variant="text" :disabled="loading" @click="cancel">Annuler</v-btn>
      <v-btn color="error" variant="flat" :disabled="confirmDisabled" :loading="loading" @click="emit('confirm')">
        {{ confirmLabel }}
      </v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
/**
 * Cadre commun des confirmations qui annulent quelque chose (changement d'équipe, de position dans le cycle, désactivation et
 * suppression d'un compte) : fenêtre persistante, avertissement (slot `alert`), contenu (en général des `ImpactPreview`), boutons
 * Annuler / confirmer. Fermer par la croix ou par Annuler ferme le `v-model` et émet `cancel`.
 */
defineProps({
  title: { type: String, required: true },
  confirmLabel: { type: String, required: true },
  confirmDisabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  alertType: { type: String, default: 'warning' },
  alertIcon: { type: String, default: 'mdi-alert-outline' },
  maxWidth: { type: [String, Number], default: 640 },
});

const modelValue = defineModel({ type: Boolean, default: false });
const emit = defineEmits(['confirm', 'cancel']);

const cancel = () => {
  modelValue.value = false;
  emit('cancel');
};
</script>
