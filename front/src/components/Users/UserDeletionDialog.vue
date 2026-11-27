<template>
  <GenericDialog
    :model-value="modelValue"
    title="Supprimer définitivement le compte"
    max-width="640"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('cancel')"
  >
    <template #content>
      <div v-if="impact" class="d-flex flex-column ga-4">
        <v-alert type="error" icon="mdi-alert-outline" rounded="xl">
          <div class="text-body-large font-weight-medium">{{ impact.user.name }} ({{ impact.user.email }})</div>
          <div class="text-body-medium">
            Le compte et tout ce qui le concerne seront effacés. Cette action est irréversible.
          </div>
        </v-alert>

        <v-alert v-if="impact.isLastCenterAdmin" type="warning" icon="mdi-shield-alert-outline" rounded="xl">
          C'est le dernier administrateur de son centre : le centre n'aura plus d'administrateur.
        </v-alert>

        <section>
          <div class="text-title-small mb-1">À partir du {{ formatDay(impact.from) }}, pour les autres utilisateurs</div>
          <div v-if="!impact.demands.length" class="text-body-medium text-medium-emphasis">
            Aucune demande à venir concernée.
          </div>
          <template v-else>
            <div class="text-body-small text-medium-emphasis mb-2">
              Les personnes concernées seront prévenues par e-mail.
            </div>
            <v-list density="compact" bg-color="transparent" class="pa-0 demand-list">
              <v-list-item
                v-for="demand in impact.demands"
                :key="demand.id"
                class="px-0"
                :prepend-icon="demand.action === 'cancel' ? 'mdi-close-circle-outline' : 'mdi-account-arrow-left-outline'"
                :title="demandTitle(demand)"
                :subtitle="demandSubtitle(demand)"
              />
            </v-list>
          </template>
        </section>

        <section>
          <div class="text-title-small mb-1">Sera effacé</div>
          <div class="text-body-medium">
            Le profil, le calendrier et ses notes, les demandes publiées (passées comprises), les transferts de points (ceux en
            attente n'auront pas lieu), les tickets, les messages et les données de l'ancien site.
          </div>
        </section>

        <section class="text-body-small text-medium-emphasis">
          <div class="text-title-small text-high-emphasis mb-1">Ne change pas</div>
          Le planning passé des collègues, leurs propres demandes (celles que ce compte avait acceptées n'ont plus
          d'accepteur), les soldes de points et les bannières écrites par ce compte, qui restent sans auteur. Les transferts
          effacés disparaissent aussi de l'historique de l'autre personne.
        </section>

        <v-checkbox v-model="understood" color="error" hide-details label="Je comprends que cette suppression est définitive" />
      </div>
    </template>
    <template #footer>
      <v-btn variant="text" :disabled="loading" @click="cancel">Annuler</v-btn>
      <v-btn color="error" variant="flat" :disabled="!understood" :loading="loading" @click="emit('confirm')">
        Supprimer définitivement
      </v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
import { formatDay } from '@/utils/dayFields.js';

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  /** Réponse 409 de DELETE /user/:id : ce que la suppression ferait */
  impact: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

// La case est à recocher à chaque ouverture
const understood = ref(false);
watch(
  () => [props.modelValue, props.impact],
  () => {
    understood.value = false;
  },
);

const cancel = () => {
  emit('update:modelValue', false);
  emit('cancel');
};

const SHORT_DATE = { day: 'numeric', month: 'short', year: 'numeric' };

const demandTitle = (demand) => {
  const day = formatDay(demand.date, SHORT_DATE);
  return demand.action === 'cancel' ? `Demande du ${day} annulée` : `Désistement de la demande du ${day}`;
};

const demandSubtitle = (demand) => {
  const people = [`de ${demand.poster ?? '?'}`];
  if (demand.accepter) people.push(`acceptée par ${demand.accepter}`);
  if (demand.cascade) people.push('dépend d’une autre demande');
  return people.join(' · ');
};
</script>

<style scoped>
.demand-list {
  max-height: 240px;
  overflow-y: auto;
}
</style>
