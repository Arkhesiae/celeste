<template>
  <div ref="root" class="team-timeline">
    <!-- Mois -->
    <div class="tl-months" aria-hidden="true">
      <span v-for="tick in monthTicks" :key="tick.key" class="tl-month" :style="{ left: tick.left + '%' }">
        {{ tick.label }}
        <span v-if="tick.year" class="tl-year">{{ tick.year }}</span>
      </span>
      <span v-if="todayPct !== null" class="tl-today-label" :style="{ left: todayPct + '%' }">Auj.</span>
    </div>

    <p v-if="!rows.length" class="text-body-small text-medium-emphasis my-2">
      {{ emptyText }}
    </p>

    <div v-for="row in preparedRows" :key="row.key" class="tl-row">
      <div class="tl-label">
        <span class="tl-name">{{ row.label }}</span>
        <v-chip v-if="row.badge" size="x-small" variant="tonal" rounded="lg" class="ml-2">
          {{ row.badge }}
        </v-chip>
      </div>

      <div class="tl-track" role="img" :aria-label="row.ariaLabel">
        <div v-if="todayPct !== null" class="tl-past" :style="{ width: todayPct + '%' }" />
        <div
          v-for="(bar, i) in row.bars"
          :key="i"
          class="tl-bar"
          :class="bar.kind === 'reinforcement' ? 'tl-bar--reinforcement' : 'tl-bar--permanent'"
          :style="bar.style"
          :title="bar.title"
        />
        <div v-if="todayPct !== null" class="tl-today" :style="{ left: todayPct + '%' }" />
      </div>
    </div>

    <!-- Légende -->
    <div v-if="legend && rows.length" class="tl-legend text-label-small">
      <span><i class="tl-swatch tl-swatch--permanent" /> Permanent</span>
      <span><i class="tl-swatch tl-swatch--reinforcement" /> Renfort</span>
      <span><i class="tl-swatch tl-swatch--past" /> Passé</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Frise horizontale sur une fenêtre de dates (par défaut ~1 an autour d'aujourd'hui).
 * Une ligne par ligne `rows` ; chaque segment est { kind: 'permanent' | 'reinforcement', from, to|null } (YYYY-MM-DD,
 * bornes incluses, to null = sans fin). Les renforts se distinguent par la couleur ET par des hachures.
 */
const props = defineProps({
  rows: { type: Array, default: () => [] },                 // [{ key, label, badge?, segments }]
  window: { type: Object, required: true },                 // { from, to }
  legend: { type: Boolean, default: true },
  emptyText: { type: String, default: 'Aucune période sur cette fenêtre.' },
});

const DAY_MS = 86400000;
const dayOf = (key) => Math.floor(Date.parse(`${key}T00:00:00Z`) / DAY_MS);
const keyOf = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);

const startDay = computed(() => dayOf(props.window.from));
const endDay = computed(() => dayOf(props.window.to));
const totalDays = computed(() => Math.max(endDay.value - startDay.value + 1, 1));
const pct = (day) => ((day - startDay.value) / totalDays.value) * 100;

// Aujourd'hui, en date locale de l'utilisateur
const todayKey = computed(() => new Date().toLocaleDateString('sv-SE'));
const todayPct = computed(() => {
  const d = dayOf(todayKey.value);
  return d >= startDay.value && d <= endDay.value ? pct(d) : null;
});

// ── Mois ────────────────────────────────────────────────────────────────────
const width = ref(400);
let observer;
const root = ref(null);
onMounted(() => {
  if (!root.value || typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver(([entry]) => { width.value = entry.contentRect.width; });
  observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());

const monthTicks = computed(() => {
  const wide = width.value >= 560;                           // assez de place pour « janv. » sinon la lettre
  const ticks = [];
  const first = new Date(`${props.window.from}T00:00:00Z`);
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + (first.getUTCDate() > 1 ? 1 : 0), 1));
  while (dayOf(cursor.toISOString().slice(0, 10)) <= endDay.value) {
    const key = cursor.toISOString().slice(0, 10);
    ticks.push({
      key,
      left: pct(dayOf(key)),
      label: cursor.toLocaleDateString('fr-FR', { month: wide ? 'short' : 'narrow', timeZone: 'UTC' }),
      year: cursor.getUTCMonth() === 0 || !ticks.length ? String(cursor.getUTCFullYear()) : null,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
});

// ── Lignes ──────────────────────────────────────────────────────────────────
const fmt = (key) => new Date(`${key}T00:00:00Z`)
  .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const KIND_LABEL = { permanent: 'Permanent', reinforcement: 'Renfort' };
const periodText = (s) => (s.to ? `du ${fmt(s.from)} au ${fmt(s.to)}` : `à partir du ${fmt(s.from)}`);

const preparedRows = computed(() => props.rows.map((row) => {
  const bars = [];
  for (const s of row.segments ?? []) {
    const from = Math.max(dayOf(s.from), startDay.value);
    const to = Math.min(s.to ? dayOf(s.to) : endDay.value, endDay.value);
    if (to < from) continue;                                  // hors fenêtre

    const left = pct(from);
    const roundLeft = dayOf(s.from) >= startDay.value;        // bord plat quand le segment déborde de la fenêtre
    const roundRight = s.to !== null && dayOf(s.to) <= endDay.value;
    bars.push({
      kind: s.kind,
      title: `${KIND_LABEL[s.kind] ?? s.kind} · ${periodText(s)}`,
      style: {
        left: `${left}%`,
        width: `${pct(to + 1) - left}%`,
        borderRadius: `${roundLeft ? 7 : 0}px ${roundRight ? 7 : 0}px ${roundRight ? 7 : 0}px ${roundLeft ? 7 : 0}px`,
      },
    });
  }
  const summary = (row.segments ?? []).map((s) => `${KIND_LABEL[s.kind] ?? s.kind} ${periodText(s)}`).join(' ; ');
  return {
    key: row.key,
    label: row.label,
    badge: row.badge,
    bars,
    ariaLabel: `${row.label} : ${summary || 'aucune période'}`,
  };
}));

defineExpose({ keyOf });
</script>

<style scoped>
.team-timeline {
  position: relative;
  width: 100%;
}

.tl-months {
  position: relative;
  height: 28px;
  font-size: 10px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.tl-month {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.1;
  padding-left: 2px;
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  height: 100%;
}

.tl-year {
  font-weight: 700;
}

.tl-today-label {
  position: absolute;
  bottom: 0;
  transform: translateX(-50%);
  padding: 0 4px;
  font-size: 9px;
  font-weight: 700;
  border-radius: 6px;
  background: rgb(var(--v-theme-on-surface));
  color: rgb(var(--v-theme-surface));
}

.tl-row {
  margin: 6px 0 10px;
}

.tl-label {
  display: flex;
  align-items: center;
  margin-bottom: 3px;
  font-size: 13px;
}

.tl-name {
  font-weight: 500;
}

.tl-track {
  position: relative;
  height: 14px;
  border-radius: 7px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.07);
}

.tl-bar {
  position: absolute;
  top: 0;
  bottom: 0;
}

.tl-bar--permanent {
  background: rgb(var(--v-theme-primary));
}

/* Renfort : autre couleur + hachures, pour ne pas dépendre de la seule couleur */
.tl-bar--reinforcement {
  background: repeating-linear-gradient(
    135deg,
    rgb(var(--v-theme-secondary)) 0 5px,
    rgba(var(--v-theme-secondary), 0.45) 5px 9px
  );
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-on-surface), 0.25);
}

/* Le passé est estompé par-dessus les barres */
.tl-past {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  background: rgba(var(--v-theme-surface), 0.55);
  pointer-events: none;
}

.tl-today {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 3;
  width: 2px;
  margin-left: -1px;
  background: rgb(var(--v-theme-on-surface));
}

.tl-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.tl-swatch {
  display: inline-block;
  width: 18px;
  height: 8px;
  margin-right: 4px;
  border-radius: 4px;
  vertical-align: middle;
}

.tl-swatch--permanent {
  background: rgb(var(--v-theme-primary));
}

.tl-swatch--reinforcement {
  background: repeating-linear-gradient(135deg, rgb(var(--v-theme-secondary)) 0 4px, rgba(var(--v-theme-secondary), 0.45) 4px 7px);
}

.tl-swatch--past {
  background: rgba(var(--v-theme-on-surface), 0.2);
}
</style>
