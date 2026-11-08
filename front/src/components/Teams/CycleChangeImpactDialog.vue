<template>
  <base-dialog
    v-model="modelValue"
    title="Ce changement affecte des plannings"
    icon="mdi-alert-outline"
    max-width="520"
    persistent
  >
    <p class="text-body-medium mb-2">
      {{ impact?.message }}
    </p>
    <p class="text-body-small text-medium-emphasis mb-4">
      Si vous continuez, les demandes ci-dessous sont annulées (ou l'accepteur est retiré), les entrées de calendrier
      liées à une vacation sont désactivées, et les personnes concernées sont prévenues par email.
      Les absences et formations sans vacation sont conservées.
    </p>

    <!-- Une ligne compacte par membre : nom + compteurs ; un clic déroule le détail -->
    <div class="cic-list">
      <div v-for="member in impact?.members ?? []" :key="member.userId" class="cic-member">
        <div
          class="cic-row d-flex align-center ga-2 px-3 py-2 cursor-pointer"
          role="button"
          tabindex="0"
          :aria-expanded="isOpen(member.userId)"
          @click="toggle(member.userId)"
          @keydown.enter.prevent="toggle(member.userId)"
          @keydown.space.prevent="toggle(member.userId)"
        >
          <span class="text-body-medium font-weight-bold text-truncate flex-grow-1">{{ member.name }}</span>
          <v-chip v-if="member.substitutions.length" size="x-small" rounded="lg" variant="tonal" prepend-icon="mdi-swap-horizontal">
            {{ member.substitutions.length }}
          </v-chip>
          <v-chip v-if="member.entries.length" size="x-small" rounded="lg" variant="tonal" prepend-icon="mdi-calendar-remove-outline">
            {{ member.entries.length }}
          </v-chip>
          <v-icon size="20" class="cic-chevron" :class="{ 'cic-chevron--open': isOpen(member.userId) }">
            mdi-chevron-down
          </v-icon>
        </div>

        <v-expand-transition>
          <div v-show="isOpen(member.userId)" class="px-3 pb-2">
            <div v-for="sub in member.substitutions" :key="sub.id" class="text-body-small">
              <v-icon size="14" class="mr-1">
                mdi-swap-horizontal
              </v-icon>
              {{ formatDay(sub.date) }} · {{ typeLabel(sub.type) }} · {{ actionLabel(sub) }}
            </div>
            <div v-for="entry in member.entries" :key="entry.id" class="text-body-small">
              <v-icon size="14" class="mr-1">
                mdi-calendar-remove-outline
              </v-icon>
              {{ formatDay(entry.date) }} · {{ entryLabel(entry) }} désactivée
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>

    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="modelValue = false">
        Annuler
      </v-btn>
      <v-btn variant="text" color="error" :loading="loading" @click="emit('confirm')">
        Forcer le changement
      </v-btn>
    </template>
  </base-dialog>
</template>

<script setup>
import { Temporal } from '@js-temporal/polyfill';
import { entryTypes } from '@/utils/entryIcons';

defineProps({
  /** Réponse 409 de PUT /teams/:id/cycle-position : { message, teams, members: [{ userId, name, substitutions, entries }] } */
  impact: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const modelValue = defineModel({ type: Boolean, default: false });
const emit = defineEmits(['confirm']);

// Membres dont le détail est déroulé (tous repliés au départ : la liste reste courte)
const openIds = ref(new Set());
const isOpen = (id) => openIds.value.has(id);
const toggle = (id) => {
  const next = new Set(openIds.value);
  if (!next.delete(id)) next.add(id);
  openIds.value = next;
};

const TYPE_LABELS = { substitution: 'Remplacement', switch: 'Permutation', hybrid: 'Hybride' };

const typeLabel = (type) => TYPE_LABELS[type] ?? 'Demande';

const actionLabel = (sub) => {
  if (sub.action === 'withdraw') return "retrait de l'accepteur";
  return sub.cascade ? 'annulée (dépend d\'une autre demande)' : 'annulée';
};

const entryLabel = (entry) => entryTypes.find((e) => e.key === entry.subType)?.label
  ?? { modification: 'Modification', assignment: 'Affectation', hourpatch: 'Ajustement d\'horaires' }[entry.type?.toLowerCase()]
  ?? 'Entrée';

const formatDay = (key) => (key
  ? Temporal.PlainDate.from(key).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  : '—');
</script>

<style scoped>
.cic-list { max-height: 280px; overflow-y: auto; }

.cic-member { border-bottom: 1px solid rgba(var(--v-theme-outlineVariant), 0.4); }
.cic-member:last-child { border-bottom: 0; }

.cic-row { border-radius: 12px; transition: background var(--motion-standard-fast-effects); }
.cic-row:hover { background: rgba(var(--v-theme-onSurface), 0.05); }
.cic-row:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: -2px; }

.cic-chevron { transition: transform var(--motion-standard-fast-effects); }
.cic-chevron--open { transform: rotate(180deg); }
</style>
