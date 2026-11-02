<template>
  <v-dialog :model-value="modelValue" :fullscreen="smAndDown" max-width="900px" persistent
    @update:model-value="emit('update:modelValue', $event)">
    <v-card rounded="xl" elevation="0" class="pa-6">
      <v-card-item prepend-icon="mdi-alert-outline" class="pa-0 ma-0">
        <v-card-title>Confirmer le changement d'équipe</v-card-title>
      </v-card-item>

      <v-card-text class="pa-0 my-4 ma-0">
        <span class="text-body-small">
          Ce changement modifie l'équipe sur {{ changes.length > 1 ? 'les périodes' : 'la période' }} ci-dessous.
          Les demandes et entrées de calendrier listées seront annulées.
        </span>

        <!-- Frise : équipe propriétaire avant / après, périodes modifiées en surbrillance -->
        <div class="timeline my-6" role="img" :aria-label="timelineLabel">
          <div v-for="row in rows" :key="row.key" class="timeline-row">
            <span class="timeline-row-label text-label-small">{{ row.label }}</span>
            <div class="timeline-track">
              <div v-for="(bar, i) in row.bars" :key="i" class="timeline-bar" :style="bar.style" :title="bar.title">
                <span class="timeline-bar-text">{{ bar.name }}</span>
              </div>
              <div v-for="band in bands" :key="band.index" class="timeline-band" :style="band.style" />
            </div>
          </div>
          <div class="timeline-axis text-label-small">
            <span>{{ axis.start }}</span>
            <span v-for="band in bands" :key="band.index" class="timeline-axis-mark" :style="{ left: band.left }">
              {{ band.index }}
            </span>
            <span>{{ axis.end }}</span>
          </div>
        </div>

        <v-card v-for="(change, i) in changes" :key="i" class="pa-4 my-4" rounded="xl" elevation="0"
          color="surfaceContainer">
          <div class="d-flex align-center flex-wrap ga-2">
            <v-chip size="x-small" color="error" variant="flat" rounded="xl">{{ i + 1 }}</v-chip>
            <span class="text-body-small">{{ periodLabel(change) }}</span>
            <v-spacer />
            <v-chip size="x-small" variant="tonal" rounded="xl">{{ teamName(change.oldTeam) }}</v-chip>
            <v-icon icon="mdi-arrow-right" size="x-small" color="primary" />
            <v-chip size="x-small" variant="tonal" rounded="xl">{{ teamName(change.newTeam) }}</v-chip>
          </div>

          <v-divider class="my-3" />

          <div class="text-label-large font-weight-bold mb-1">
            Demandes ({{ change.substitutions.length }})
          </div>
          <div v-if="!change.substitutions.length" class="text-body-small text-medium-emphasis">
            Aucune demande concernée
          </div>
          <v-list v-else density="compact" class="pa-0 impact-list" bg-color="transparent">
            <v-list-item v-for="sub in change.substitutions" :key="sub.id" class="px-0">
              <template #prepend>
                <v-chip size="x-small" rounded="xl" variant="tonal" class="mr-2"
                  :color="sub.action === 'withdraw' ? 'warning' : 'error'">
                  {{ actionLabel(sub) }}
                </v-chip>
              </template>
              <v-list-item-title class="text-body-small">
                {{ typeLabel(sub.type) }} du {{ formatKey(sub.date) }}
                <span v-if="sub.accepterDate && sub.accepterDate !== sub.date"> / {{ formatKey(sub.accepterDate) }}</span>
              </v-list-item-title>
              <v-list-item-subtitle class="text-label-small">
                {{ sub.poster }}<template v-if="sub.accepter"> → {{ sub.accepter }}</template>
                · {{ sub.status === 'accepted' ? 'acceptée' : 'ouverte' }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <div class="text-label-large font-weight-bold mt-4 mb-1">
            Entrées de calendrier ({{ change.entries.length }})
          </div>
          <div v-if="!change.entries.length" class="text-body-small text-medium-emphasis">
            Aucune entrée concernée
          </div>
          <div v-else class="d-flex flex-wrap ga-1 impact-list">
            <v-chip v-for="entry in change.entries" :key="entry.id" size="x-small" rounded="xl" variant="tonal">
              {{ formatKey(entry.date) }} · {{ entryLabel(entry) }}
            </v-chip>
          </div>
        </v-card>
      </v-card-text>

      <v-card-actions class="pa-0">
        <v-btn color="secondary" variant="outlined" rounded="xl" :disabled="loading" @click="emit('cancel')">
          Annuler
        </v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" rounded="xl" :loading="loading" @click="emit('confirm')">
          Confirmer et annuler
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { useDisplay } from 'vuetify';

/**
 * Impact d'un changement d'équipe (réponse 409 de /users/:id/assign-team et /team-occurrences/:id) :
 * frise avant/après + demandes et entrées de calendrier qui seront annulées.
 * `approval` = { segments: { before, after }, teams: { [id]: name }, changes: [...] }
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  approval: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const { smAndDown } = useDisplay();

const DAY_MS = 86400000;
const dayOf = (key) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

const changes = computed(() => props.approval?.changes ?? []);

const teamName = (id) => (id ? `Équipe ${props.approval?.teams?.[id] ?? '?'}` : 'Aucune équipe');

const formatKey = (key) => key
  ? new Date(`${key}T00:00:00Z`).toLocaleDateString('fr-FR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
  : '';

const periodLabel = ({ from, to }) => (to ? `Du ${formatKey(from)} au ${formatKey(to)}` : `À partir du ${formatKey(from)}`);

// ── Libellés ────────────────────────────────────────────────────────────────

const TYPE_LABELS = { substitution: 'Remplacement', switch: 'Permutation', hybrid: 'Remplacement / permutation' };
const typeLabel = (type) => TYPE_LABELS[type] ?? 'Demande';

const actionLabel = (sub) => {
  if (sub.action === 'withdraw') return 'Désistement';
  return sub.cascade ? 'Annulée (cascade)' : 'Annulée';
};

const ENTRY_LABELS = { assignment: 'Affectation', modification: 'Modification', hour_patch: 'Ajustement horaire' };
const entryLabel = ({ type, subType }) => `${ENTRY_LABELS[type] ?? type}${subType ? ` (${subType})` : ''}`;

// ── Frise ───────────────────────────────────────────────────────────────────
// Fenêtre centrée sur les périodes modifiées ; les segments qui la dépassent sont tronqués.

const windowDays = computed(() => {
  const list = changes.value;
  if (!list.length) return { start: 0, end: 1 };

  const starts = list.map((c) => dayOf(c.from));
  const finiteEnds = list.filter((c) => c.to).map((c) => dayOf(c.to));
  const hasOpenEnd = list.some((c) => !c.to);

  const start = Math.min(...starts);
  const lastKnown = Math.max(...starts, ...finiteEnds);
  const span = Math.max(lastKnown - start, 1);
  const pad = Math.max(7, Math.round(span * 0.25));

  return {
    start: start - pad,
    end: lastKnown + (hasOpenEnd ? Math.max(pad, 30) : pad),
  };
});

const pct = (day) => ((day - windowDays.value.start) / (windowDays.value.end - windowDays.value.start + 1)) * 100;

const barsOf = (segments = []) => segments
  .map((segment) => {
    const from = Math.max(dayOf(segment.from), windowDays.value.start);
    const to = Math.min(segment.to ? dayOf(segment.to) : windowDays.value.end, windowDays.value.end);
    if (to < from) return null;

    const left = pct(from);
    const width = pct(to + 1) - left;
    return {
      name: teamName(segment.teamId).replace('Équipe ', ''),
      title: `${teamName(segment.teamId)} · ${periodLabel(segment)}`,
      style: { left: `${left}%`, width: `${width}%` },
    };
  })
  .filter(Boolean);

const rows = computed(() => [
  { key: 'before', label: 'Avant', bars: barsOf(props.approval?.segments?.before) },
  { key: 'after', label: 'Après', bars: barsOf(props.approval?.segments?.after) },
]);

const bands = computed(() => changes.value.map((change, i) => {
  const from = dayOf(change.from);
  const to = change.to ? dayOf(change.to) : windowDays.value.end;
  const left = pct(from);
  return {
    index: i + 1,
    left: `${left}%`,
    style: { left: `${left}%`, width: `${pct(to + 1) - left}%` },
  };
}));

const keyOfDay = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const axis = computed(() => ({
  start: formatKey(keyOfDay(windowDays.value.start)),
  end: formatKey(keyOfDay(windowDays.value.end)),
}));

const timelineLabel = computed(() =>
  `Frise des équipes avant et après le changement, ${changes.value.length} période(s) modifiée(s)`);
</script>

<style scoped>
.timeline {
  position: relative;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.timeline-row-label {
  width: 44px;
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.timeline-track {
  position: relative;
  flex: 1;
  height: 32px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-onSurface), 0.06);
}

.timeline-bar {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #fff;
  font-size: 11px;
  background: rgba(var(--v-theme-primary), 0.7);
  font-weight: 600;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.timeline-bar-text {
  padding: 0 4px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

/* Périodes modifiées, au-dessus des barres des deux lignes */
.timeline-band {
  position: absolute;
  top: 0;
  bottom: 0;
  background: repeating-linear-gradient(135deg, rgba(var(--v-theme-error), 0.35) 0 6px, rgba(var(--v-theme-error), 0.15) 6px 12px);
  outline: 1px solid rgb(var(--v-theme-error));
  outline-offset: -2px;
  pointer-events: none;
}

.timeline-axis {
  position: relative;
  display: flex;
  justify-content: space-between;
  margin-left: 52px;
  height: 20px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.timeline-axis-mark {
  position: absolute;
  transform: translateX(-50%);
  font-weight: 700;
  color: rgb(var(--v-theme-error));
}

.impact-list {
  max-height: 200px;
  overflow-y: auto;
}
</style>
