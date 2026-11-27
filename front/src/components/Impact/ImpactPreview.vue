<template>
  <div class="d-flex flex-column ga-4">
    <section v-for="group in groups" :key="group.key" :aria-labelledby="`${uid}-${group.key}`">
      <component :is="headingTag" :id="`${uid}-${group.key}`" class="d-flex align-center ga-2 text-title-small mb-1">
        <v-icon :icon="group.icon" size="20" aria-hidden="true" />
        {{ group.title }} ({{ group.items.length }})
      </component>

      <p v-if="!group.items.length" class="text-body-small text-medium-emphasis">{{ group.empty }}</p>

      <!-- Une vraie liste : les lecteurs d'écran annoncent le nombre d'éléments. `role` : Safari le perd sans puces -->
      <ul v-else class="impact-list" role="list">
        <li v-for="item in group.items" :key="item.id" class="d-flex ga-3 py-2 impact-item">
          <!-- Icônes décoratives : tout ce qu'elles disent est aussi écrit -->
          <v-icon :icon="item.icon" :color="item.color" size="20" class="mt-1" aria-hidden="true" />
          <div class="min-width-0 flex-grow-1">
            <div class="text-body-medium">{{ item.title }}</div>
            <div v-if="item.subtitle" class="text-body-small text-medium-emphasis">{{ item.subtitle }}</div>
            <ul
              v-if="item.transfers?.length"
              class="impact-list mt-1"
              role="list"
              aria-label="Transferts de points annulés avec la demande"
            >
              <li v-for="transfer in item.transfers" :key="transfer.id" class="d-flex align-start ga-2 text-body-small">
                <v-icon icon="mdi-cash-remove" color="error" size="16" class="mt-1" aria-hidden="true" />
                <span>{{ transferTitle(transfer) }}</span>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed, useId } from 'vue';
import { formatDay } from '@/utils/dayFields.js';
import { demandImpact, entryImpact, transferTitle } from '@/utils/impactLabels.js';

/**
 * Aperçu de ce qu'un changement annulera, commun aux confirmations (changement d'équipe, désactivation et suppression d'un
 * compte) : demandes (avec leurs transferts de points), autres transferts de points différés, entrées de calendrier.
 * Les données viennent de `previewUserPeriodImpact` côté serveur. Une liste absente (`null`) n'a pas de rubrique ; une liste vide
 * dit qu'il n'y a rien, sauf pour les autres transferts, montrés seulement s'il y en a.
 * Pas de défilement propre : c'est la fenêtre qui défile, tout est visible au clavier.
 */
const props = defineProps({
  demands: { type: Array, default: null },
  entries: { type: Array, default: null },
  /** Transferts en attente qu'aucune demande listée ne porte */
  transfers: { type: Array, default: null },
  /** Niveau des titres de rubrique, selon la place de l'aperçu dans la fenêtre */
  headingTag: { type: String, default: 'h3' },
});

const uid = useId();
const SHORT_DATE = { day: 'numeric', month: 'short', year: 'numeric' };

const groups = computed(() =>
  [
    props.demands && {
      key: 'demands',
      title: 'Demandes',
      icon: 'mdi-account-arrow-right-outline',
      empty: 'Aucune demande concernée.',
      items: props.demands.map(demandImpact),
    },
    props.transfers?.length && {
      key: 'transfers',
      title: 'Autres transferts de points annulés',
      icon: 'mdi-cash-remove',
      items: props.transfers.map((transfer) => ({
        id: transfer.id,
        icon: 'mdi-cash-remove',
        color: 'error',
        title: transferTitle(transfer),
        subtitle: transfer.date ? `Prévu le ${formatDay(transfer.date, SHORT_DATE)}` : '',
      })),
    },
    props.entries && {
      key: 'entries',
      title: 'Entrées de calendrier désactivées',
      icon: 'mdi-calendar-remove-outline',
      empty: 'Aucune entrée de calendrier concernée.',
      items: props.entries.map(entryImpact),
    },
  ].filter(Boolean),
);
</script>

<style scoped>
.impact-list {
  list-style: none;
  padding: 0;
}

.impact-item + .impact-item {
  border-top: 1px solid rgba(var(--v-theme-onSurface), 0.12);
}
</style>
