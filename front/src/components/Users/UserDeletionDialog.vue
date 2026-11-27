<template>
  <ImpactDialog
    v-model="modelValue"
    title="Supprimer définitivement le compte"
    confirm-label="Supprimer définitivement"
    alert-type="error"
    :confirm-disabled="!understood"
    :loading="loading"
    @confirm="emit('confirm')"
    @cancel="emit('cancel')"
  >
    <template #alert>
      <template v-if="impact">
        <div class="text-body-large font-weight-medium">{{ impact.user.name }} ({{ impact.user.email }})</div>
        <div class="text-body-medium">
          Le compte et tout ce qui le concerne seront effacés. Cette action est irréversible.
        </div>
      </template>
    </template>

    <template v-if="impact">
      <v-alert v-if="impact.isLastCenterAdmin" type="warning" icon="mdi-shield-alert-outline" rounded="xl">
        C'est le dernier administrateur de son centre : le centre n'aura plus d'administrateur.
      </v-alert>

      <section class="d-flex flex-column ga-2" aria-label="Ce qui sera annulé pour les autres utilisateurs">
        <p class="text-body-small text-medium-emphasis">
          Pour les autres utilisateurs : demandes à partir du {{ formatDay(impact.from) }} et transferts de points en
          attente. Les personnes concernées seront prévenues par e-mail.
        </p>
        <ImpactPreview :demands="impact.demands" :transfers="impact.pendingTransfers" />
      </section>

      <section>
        <div class="text-title-small mb-1">Sera effacé</div>
        <div class="text-body-medium">
          Le profil, le calendrier et ses notes, les demandes publiées (passées comprises), les transferts de points
          (ceux en attente n'auront pas lieu), les tickets, les messages et les données de l'ancien site.
        </div>
      </section>

      <section class="text-body-small text-medium-emphasis">
        <div class="text-title-small text-high-emphasis mb-1">Ne change pas</div>
        Le planning passé des collègues, leurs propres demandes (celles que ce compte avait acceptées n'ont plus
        d'accepteur), les soldes de points et les bannières écrites par ce compte, qui restent sans auteur. Les
        transferts effacés disparaissent aussi de l'historique de l'autre personne.
      </section>

      <v-checkbox
        v-model="understood"
        color="error"
        hide-details
        label="Je comprends que cette suppression est définitive"
      />
    </template>
  </ImpactDialog>
</template>

<script setup>
import ImpactDialog from '@/components/Impact/ImpactDialog.vue';
import ImpactPreview from '@/components/Impact/ImpactPreview.vue';
import { formatDay } from '@/utils/dayFields.js';

const props = defineProps({
  /** Réponse 409 de DELETE /user/:id : ce que la suppression ferait */
  impact: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const modelValue = defineModel({ type: Boolean, required: true });
const emit = defineEmits(['confirm', 'cancel']);

// La case est à recocher à chaque ouverture
const understood = ref(false);
watch(
  () => [modelValue.value, props.impact],
  () => {
    understood.value = false;
  },
);
</script>
