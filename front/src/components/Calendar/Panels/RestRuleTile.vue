<template>
  <v-card rounded="xl" elevation="0" color="surfaceContainer" class="rest-tile pa-4">
    <div class="d-flex align-start justify-space-between ga-2 mb-3">
      <div class="d-flex flex-column">
        <span class="text-body-small text-uppercase text-disabled">Repos hebdomadaire de {{ formatHours(limits.weeklyRestMinutes) }}</span>
        <span class="text-title-medium font-weight-medium">{{ title }}</span>
      </div>
      <v-btn
v-if="period?.start" icon="mdi-close" variant="text" size="small" aria-label="Effacer la période"
        @click="emit('clear')" />
    </div>

    <!-- Rien de choisi : on explique comment faire et on propose les périodes courantes -->
    <template v-if="!period?.start">
      <p class="text-body-medium text-medium-emphasis mb-3">
        Touchez deux jours du calendrier : la tuile contrôle que chaque période de 7 jours contient un repos continu d'au
        moins {{ formatHours(limits.weeklyRestMinutes) }}.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <v-chip v-for="preset in presets" :key="preset.key" variant="tonal" size="small" @click="emit('preset', preset.key)">
          {{ preset.label }}
        </v-chip>
      </div>
    </template>

    <!-- Premier jour choisi, deuxième attendu -->
    <p v-else-if="!period.end" class="text-body-medium text-medium-emphasis mb-0">
      Début : <strong>{{ formatDayShort(period.start) }}</strong>. Choisissez le dernier jour de la période.
    </p>

    <p v-else-if="!verdict.evaluated" class="text-body-medium text-medium-emphasis mb-0">
      Cette période déborde du mois affiché : changez de mois ou réduisez la sélection.
    </p>

    <template v-else>
      <!-- Verdict : icône + texte, jamais la teinte seule -->
      <div class="verdict mb-3" :class="verdict.rest.ok ? 'verdict--ok' : 'verdict--ko'" role="status">
        <v-icon size="20">{{ verdict.rest.ok ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}</v-icon>
        <span class="text-body-medium font-weight-medium">{{ verdictText }}</span>
      </div>

      <p class="text-body-small text-medium-emphasis mb-3">{{ scopeText }}</p>

      <!-- La période la plus défavorable : c'est elle qui décide -->
      <div class="mb-3">
        <div class="d-flex justify-space-between align-baseline">
          <span class="text-body-medium">Plus court repos continu</span>
          <span class="text-body-medium font-weight-medium tabular">{{ formatHours(verdict.rest.worst.longestRestMinutes) }} <span
              class="text-medium-emphasis">/ {{ formatHours(limits.weeklyRestMinutes) }} min.</span></span>
        </div>
        <v-progress-linear
:model-value="restPercent" :color="verdict.rest.ok ? 'primary' : 'error'" height="10" rounded
          bg-color="onSurface" bg-opacity="0.12" :aria-label="`Plus court repos continu : ${formatHours(verdict.rest.worst.longestRestMinutes)}`" />
        <span class="text-body-small text-medium-emphasis">
          Période du {{ formatDayRange(verdict.rest.worst.start, verdict.rest.worst.end) }}<template
            v-if="verdict.rest.worst.longestRestFrom"> · {{ formatLocalMoment(verdict.rest.worst.longestRestFrom) }} → {{ formatLocalMoment(verdict.rest.worst.longestRestTo) }}</template>
        </span>
      </div>

      <!-- Les périodes en défaut, cliquables : on les regarde dans la tuile de fenêtre -->
      <div v-if="failing.length" class="mb-3">
        <span class="text-body-small text-medium-emphasis">{{ failing.length }} période{{ failing.length > 1 ? 's' : '' }} en défaut</span>
        <div class="d-flex flex-column ga-1 mt-1">
          <button
v-for="window in failing.slice(0, MAX_LISTED)" :key="window.start" type="button" class="failing-row"
            @click="emit('inspect-window', window.start)">
            <span class="text-body-small">{{ formatDayRange(window.start, window.end) }}</span>
            <span class="text-body-small font-weight-medium tabular">{{ formatHours(window.longestRestMinutes) }}</span>
          </button>
          <span v-if="failing.length > MAX_LISTED" class="text-body-small text-medium-emphasis">
            et {{ failing.length - MAX_LISTED }} autre{{ failing.length - MAX_LISTED > 1 ? 's' : '' }}
          </span>
        </div>
      </div>

      <!-- La règle voisine, en passant : le plus de travail sur 7 jours dans la période -->
      <div class="d-flex align-center ga-2 text-body-small" :class="verdict.work.ok ? 'text-medium-emphasis' : 'text-error'">
        <v-icon size="16">{{ verdict.work.ok ? 'mdi-check' : 'mdi-alert-outline' }}</v-icon>
        <span>Travail sur 7 jours : au plus {{ formatHours(verdict.work.worst.workMinutes) }} (maximum {{ formatHours(limits.maxWeeklyWorkMinutes) }})</span>
      </div>
    </template>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import {
  daysInPeriod, formatDayRange, formatDayShort, formatHours, formatLocalMoment, periodVerdict, windowsForPeriod,
} from '@/utils/workWindows';

/**
 * Tuile « Repos hebdomadaire de 35 h » : valide la règle des 35 h sur la période choisie (deux jours du calendrier).
 * Chaque période de 7 jours concernée doit contenir un repos continu d'au moins 35 h ; la tuile donne le verdict, la période
 * la plus défavorable et la liste de celles qui sont en défaut.
 */
const props = defineProps({
  /** Période choisie : { start, end } ; `end` absent tant que le deuxième jour n'est pas choisi */
  period: { type: Object, default: null },
  /** Périodes de 7 jours renvoyées par le serveur */
  windows: { type: Array, required: true },
  /** Seuils appliqués par le serveur */
  limits: { type: Object, required: true },
});
const emit = defineEmits(['clear', 'preset', 'inspect-window']);

const MAX_LISTED = 4;
const presets = [
  { key: 'today7', label: '7 jours à partir d\'aujourd\'hui' },
  { key: 'month', label: 'Mois affiché' },
];

const complete = computed(() => Boolean(props.period?.start && props.period?.end));
const inScope = computed(() => (complete.value ? windowsForPeriod(props.windows, props.period.start, props.period.end) : []));
const verdict = computed(() => periodVerdict(inScope.value));
const failing = computed(() => inScope.value.filter((window) => !window.restOk));

const length = computed(() => (complete.value ? daysInPeriod(props.period.start, props.period.end) : 0));
const title = computed(() => {
  if (!props.period?.start) return 'Choisir une période';
  if (!props.period.end) return formatDayShort(props.period.start);
  return `${formatDayRange(props.period.start, props.period.end)} · ${length.value} jour${length.value > 1 ? 's' : ''}`;
});

const verdictText = computed(() => (verdict.value.rest.ok
  ? `Repos de ${formatHours(props.limits.weeklyRestMinutes)} respecté`
  : `Repos de ${formatHours(props.limits.weeklyRestMinutes)} non respecté`));

// Ce que « chaque période de 7 jours » veut dire pour cette sélection
const scopeText = computed(() => {
  const count = verdict.value.evaluated;
  const periods = `${count} période${count > 1 ? 's' : ''} de 7 jours contrôlée${count > 1 ? 's' : ''}`;
  if (length.value < 7) return `${periods} : celles qui contiennent entièrement la sélection (moins de 7 jours).`;
  if (length.value === 7) return `${periods} : la période choisie.`;
  return `${periods} : toutes celles qui tiennent dans la sélection.`;
});

const restPercent = computed(() => Math.min(100, Math.max(0, (verdict.value.rest.worst.longestRestMinutes / props.limits.weeklyRestMinutes) * 100)));
</script>

<style scoped>
.tabular {
  font-variant-numeric: tabular-nums;
}

.verdict {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
}

.verdict--ok {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, transparent);
}

.verdict--ko {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 18%, transparent);
  color: rgb(var(--v-theme-error));
}

.failing-row {
  border: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 6px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, rgb(var(--v-theme-onSurface)) 6%, transparent);
  color: inherit;
  text-align: start;
  cursor: pointer;
}

.failing-row:hover {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 14%, transparent);
}

.failing-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
</style>
