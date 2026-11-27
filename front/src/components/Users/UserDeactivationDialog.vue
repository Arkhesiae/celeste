<template>
  <GenericDialog
    :model-value="modelValue"
    title="Désactiver le compte"
    max-width="640"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('update:modelValue', false)"
  >
    <template #content>
      <div v-if="impact" class="d-flex flex-column ga-4">
        <v-alert type="warning" icon="mdi-account-off-outline" rounded="xl">
          <div class="text-body-large font-weight-medium">{{ impact.user.name }} ({{ impact.user.email }})</div>
          <div class="text-body-medium">
            Ce compte ne pourra plus se connecter et sera retiré des listes de membres. Il pourra être réactivé.
          </div>
        </v-alert>

        <v-alert v-if="impact.isLastCenterAdmin" type="warning" icon="mdi-shield-alert-outline" rounded="xl">
          C'est le dernier administrateur de son centre : le centre n'aura plus d'administrateur actif.
        </v-alert>

        <section class="d-flex flex-column ga-2" aria-label="Ce qui sera annulé">
          <p class="text-body-small text-medium-emphasis">
            À partir du {{ formatDay(impact.from) }}. Les autres personnes concernées seront prévenues par e-mail. La
            réactivation ne rétablira rien de ce qui suit.
          </p>
          <ImpactPreview :demands="impact.demands" :transfers="impact.pendingTransfers" :entries="impact.entries" />
        </section>

        <section>
          <div class="text-title-small mb-1">Équipes</div>
          <div class="text-body-medium">
            La personne n'appartiendra plus à aucune équipe à partir du {{ formatDay(impact.from) }} (renforts et
            affectations à venir compris). Après une réactivation, une équipe devra lui être réassignée.
          </div>
        </section>

        <section class="text-body-small text-medium-emphasis">
          <div class="text-title-small text-high-emphasis mb-1">Est conservé</div>
          Le profil, les équipes passées, les notes du calendrier, les congés et autres entrées sans vacation, le solde
          de points et tout le passé. La personne reçoit un e-mail l'informant de la désactivation.
        </section>
      </div>
    </template>
    <template #footer>
      <v-btn variant="text" :disabled="loading" @click="emit('update:modelValue', false)">Annuler</v-btn>
      <v-btn color="error" variant="flat" :loading="loading" @click="emit('confirm')">Désactiver le compte</v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
import ImpactPreview from '@/components/Impact/ImpactPreview.vue';
import { formatDay } from '@/utils/dayFields.js';

defineProps({
  modelValue: { type: Boolean, required: true },
  /** Réponse 409 de POST /user/:id/deactivate : ce que la désactivation ferait */
  impact: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'confirm']);
</script>
