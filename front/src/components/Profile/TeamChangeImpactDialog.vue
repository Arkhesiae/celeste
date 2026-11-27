<template>
  <GenericDialog
    :model-value="modelValue"
    title="Confirmer le changement d'équipe"
    max-width="900"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('cancel')"
  >
    <template #content>
      <v-alert type="warning" icon="mdi-alert-outline" rounded="xl">
        Ce changement modifie l'équipe sur {{ changes.length > 1 ? 'les périodes' : 'la période' }} ci-dessous. Les
        demandes, transferts de points et entrées de calendrier listés seront annulés.
      </v-alert>

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

      <section v-for="(change, i) in changes" :key="i" :aria-labelledby="`${uid}-period-${i}`">
        <v-card class="pa-4 my-4" elevation="0" color="surfaceContainer">
          <h3 :id="`${uid}-period-${i}`" class="d-flex align-center flex-wrap ga-2 text-title-medium">
            <v-chip size="small" color="error" variant="flat" rounded="xl" aria-hidden="true">{{ i + 1 }}</v-chip>
            <span
              ><span class="d-sr-only">Période {{ i + 1 }} : </span>{{ periodLabel(change) }}</span
            >
          </h3>
          <p class="d-flex align-center flex-wrap ga-2 mt-2">
            <span class="d-sr-only">Équipe : de</span>
            <v-chip size="small" variant="tonal" rounded="xl">{{ teamName(change.oldTeam) }}</v-chip>
            <v-icon icon="mdi-arrow-right" size="small" color="primary" aria-hidden="true" />
            <span class="d-sr-only">vers</span>
            <v-chip size="small" variant="tonal" rounded="xl">{{ teamName(change.newTeam) }}</v-chip>
          </p>

          <v-divider class="my-3" />

          <ImpactPreview :demands="change.demands" :entries="change.entries" heading-tag="h4" />
        </v-card>
      </section>
    </template>
    <template #footer>
      <v-btn variant="text" :disabled="loading" @click="emit('cancel')">Annuler</v-btn>
      <v-btn color="error" variant="flat" :loading="loading" @click="emit('confirm')">Confirmer le changement</v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
import { computed, useId } from 'vue';
import ImpactPreview from '@/components/Impact/ImpactPreview.vue';
import { formatDay } from '@/utils/dayFields.js';

/**
 * Impact d'un changement d'équipe (réponse 409 de /users/:id/assign-team et /team-occurrences/:id) :
 * frise avant/après + ce qui sera annulé sur chaque période (ImpactPreview).
 * `approval` = { segments: { before, after }, teams: { [id]: name }, changes: [...] }
 */
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  approval: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'confirm', 'cancel']);

const uid = useId();

const DAY_MS = 86400000;
const dayOf = (key) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);

const changes = computed(() => props.approval?.changes ?? []);

const teamName = (id) => (id ? `Équipe ${props.approval?.teams?.[id] ?? '?'}` : 'Aucune équipe');

const formatKey = (key) => formatDay(key, { day: 'numeric', month: 'short', year: 'numeric' });

const periodLabel = ({ from, to }) =>
  to ? `Du ${formatKey(from)} au ${formatKey(to)}` : `À partir du ${formatKey(from)}`;

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

const barsOf = (segments = []) =>
  segments
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

const bands = computed(() =>
  changes.value.map((change, i) => {
    const from = dayOf(change.from);
    const to = change.to ? dayOf(change.to) : windowDays.value.end;
    const left = pct(from);
    return {
      index: i + 1,
      left: `${left}%`,
      style: { left: `${left}%`, width: `${pct(to + 1) - left}%` },
    };
  }),
);

const keyOfDay = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);
const axis = computed(() => ({
  start: formatKey(keyOfDay(windowDays.value.start)),
  end: formatKey(keyOfDay(windowDays.value.end)),
}));

// La frise est une image pour les lecteurs d'écran : son texte de remplacement en dit le contenu
const timelineLabel = computed(() => {
  const describe = (segments = []) =>
    segments.map((segment) => `${teamName(segment.teamId)}, ${periodLabel(segment).toLowerCase()}`).join(' ; ') ||
    'aucune équipe';
  const { before, after } = props.approval?.segments ?? {};
  return `Frise des équipes. Avant : ${describe(before)}. Après : ${describe(after)}.`;
});
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
  color: rgba(var(--v-theme-onSurface), 0.7);
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
  color: rgb(var(--v-theme-onPrimary));
  font-size: 11px;
  background: rgb(var(--v-theme-primary));
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
  background: repeating-linear-gradient(
    135deg,
    rgba(var(--v-theme-error), 0.35) 0 6px,
    rgba(var(--v-theme-error), 0.15) 6px 12px
  );
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
  color: rgba(var(--v-theme-onSurface), 0.7);
}

.timeline-axis-mark {
  position: absolute;
  transform: translateX(-50%);
  font-weight: 700;
  color: rgb(var(--v-theme-error));
}
</style>
