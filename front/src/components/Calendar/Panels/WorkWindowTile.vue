<template>
  <v-card rounded="xl" elevation="0" color="surfaceContainer" class="work-tile pa-4">
    <!-- En-tête : la période de 7 jours et de quoi la faire glisser jour par jour -->
    <div class="d-flex align-start justify-space-between ga-2 mb-3">
      <div class="d-flex flex-column">
        <span class="text-body-small text-uppercase text-disabled">Fenêtre de 7 jours</span>
        <span class="text-title-medium font-weight-medium">{{ rangeLabel }}</span>
      </div>
      <div class="d-flex align-center">
        <v-btn
icon="mdi-chevron-left" variant="text" size="small" aria-label="Fenêtre commençant un jour plus tôt"
          :disabled="!previousStart" @click="emit('update:windowStart', previousStart)" />
        <v-btn
icon="mdi-chevron-right" variant="text" size="small" aria-label="Fenêtre commençant un jour plus tard"
          :disabled="!nextStart" @click="emit('update:windowStart', nextStart)" />
      </div>
    </div>

    <p v-if="!current" class="text-body-medium text-medium-emphasis mb-0">
      Cette fenêtre déborde du mois affiché : changez de mois ou déplacez-la.
    </p>

    <template v-else>
      <!-- Verdict en une ligne : jamais la couleur seule, toujours une icône et un texte -->
      <div class="verdict mb-4" :class="allOk ? 'verdict--ok' : 'verdict--ko'" role="status">
        <v-icon size="18">{{ allOk ? 'mdi-check-circle-outline' : 'mdi-alert-circle-outline' }}</v-icon>
        <span class="text-body-medium font-weight-medium">{{ verdictText }}</span>
      </div>

      <!-- Travail cumulé : le plein est la limite de 48 h -->
      <div class="mb-4">
        <div class="d-flex justify-space-between align-baseline">
          <span class="text-body-medium">Travail</span>
          <span class="text-body-medium font-weight-medium tabular">{{ formatHours(current.workMinutes) }} <span
              class="text-medium-emphasis">/ {{ formatHours(limits.maxWeeklyWorkMinutes) }}</span></span>
        </div>
        <v-progress-linear
:model-value="workPercent" :color="current.workOk ? 'primary' : 'error'" height="10" rounded
          bg-color="onSurface" bg-opacity="0.12" :aria-label="`Travail : ${formatHours(current.workMinutes)} sur ${formatHours(limits.maxWeeklyWorkMinutes)}`" />
        <span class="text-body-small" :class="current.workOk ? 'text-medium-emphasis' : 'text-error'">
          {{ workCaption }}
        </span>
      </div>

      <!-- Plus long repos continu : le plein est le minimum de 35 h -->
      <div class="mb-4">
        <div class="d-flex justify-space-between align-baseline">
          <span class="text-body-medium">Plus long repos continu</span>
          <span class="text-body-medium font-weight-medium tabular">{{ formatHours(current.longestRestMinutes) }} <span
              class="text-medium-emphasis">/ {{ formatHours(limits.weeklyRestMinutes) }} min.</span></span>
        </div>
        <v-progress-linear
:model-value="restPercent" :color="current.restOk ? 'primary' : 'error'" height="10" rounded
          bg-color="onSurface" bg-opacity="0.12" :aria-label="`Repos continu : ${formatHours(current.longestRestMinutes)}, minimum ${formatHours(limits.weeklyRestMinutes)}`" />
        <span class="text-body-small" :class="current.restOk ? 'text-medium-emphasis' : 'text-error'">
          {{ restCaption }}
        </span>
      </div>

      <!-- Une barre par jour : la répartition de la charge, pas seulement son total -->
      <div class="days" role="img" :aria-label="`Temps travaillé par jour : ${daysSummary}`">
        <div v-for="day in windowDays" :key="day.date" class="day-col" :title="`${formatDayShort(day.date)} : ${formatHours(day.workedMinutes)}`">
          <span class="day-bar-value tabular">{{ day.workedMinutes ? formatHours(day.workedMinutes).replace(' h ', 'h').replace(' h', 'h') : '' }}</span>
          <span class="day-bar" :style="{ height: `${day.height}px` }" :class="{ 'day-bar--empty': !day.workedMinutes }" />
          <span class="day-bar-label text-label-small">{{ day.letter }}</span>
        </div>
      </div>
    </template>
  </v-card>
</template>

<script setup>
import { computed } from 'vue';
import { Temporal } from '@js-temporal/polyfill';
import { formatDayRange, formatDayShort, formatHours, windowStartingAt } from '@/utils/workWindows';

/**
 * Tuile « Fenêtre de 7 jours » : travail cumulé et plus long repos d'une période de 7 jours qui commence au jour choisi,
 * comparés aux seuils du serveur (48 h de travail au plus, 35 h de repos continu au moins), et temps travaillé de chaque jour.
 */
const props = defineProps({
  /** Premier jour de la fenêtre (YYYY-MM-DD) */
  windowStart: { type: String, required: true },
  /** Périodes de 7 jours renvoyées par le serveur */
  windows: { type: Array, required: true },
  /** Résultat du serveur par jour, indexé par date */
  daysByDate: { type: Object, required: true },
  /** Seuils appliqués par le serveur */
  limits: { type: Object, required: true },
});
const emit = defineEmits(['update:windowStart']);

const LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const BAR_MAX_HEIGHT = 44;
const BAR_SCALE_MINUTES = 12 * 60;   // une barre pleine = 12 h

const end = computed(() => Temporal.PlainDate.from(props.windowStart).add({ days: 6 }).toString());
const rangeLabel = computed(() => formatDayRange(props.windowStart, end.value));
const current = computed(() => windowStartingAt(props.windows, props.windowStart) ?? null);

// On ne fait glisser la fenêtre que sur celles que le serveur a calculées
const neighbour = (offset) => {
  const start = Temporal.PlainDate.from(props.windowStart).add({ days: offset }).toString();
  return windowStartingAt(props.windows, start) ? start : null;
};
const previousStart = computed(() => neighbour(-1));
const nextStart = computed(() => neighbour(1));

const allOk = computed(() => current.value?.workOk && current.value?.restOk);
const verdictText = computed(() => {
  if (allOk.value) return 'Dans les limites';
  if (!current.value.workOk && !current.value.restOk) return 'Trop de travail et repos insuffisant';
  return current.value.workOk ? 'Repos continu insuffisant' : 'Trop de travail sur 7 jours';
});

const percent = (value, max) => Math.min(100, Math.max(0, (value / max) * 100));
const workPercent = computed(() => percent(current.value.workMinutes, props.limits.maxWeeklyWorkMinutes));
const restPercent = computed(() => percent(current.value.longestRestMinutes, props.limits.weeklyRestMinutes));

const workCaption = computed(() => {
  const gap = props.limits.maxWeeklyWorkMinutes - current.value.workMinutes;
  return gap >= 0 ? `Il reste ${formatHours(gap)}` : `Dépassement de ${formatHours(-gap)}`;
});
const restCaption = computed(() => {
  const gap = current.value.longestRestMinutes - props.limits.weeklyRestMinutes;
  const margin = gap >= 0 ? `Marge de ${formatHours(gap)}` : `Il manque ${formatHours(-gap)}`;
  const moment = current.value.longestRestFrom ? ` · ${momentLabel(current.value.longestRestFrom)} → ${momentLabel(current.value.longestRestTo)}` : '';
  return margin + moment;
});

const momentLabel = (value) => {
  const moment = Temporal.PlainDateTime.from(value);
  const day = moment.toPlainDate().toLocaleString('fr-FR', { weekday: 'short' });
  return `${day} ${String(moment.hour).padStart(2, '0')}:${String(moment.minute).padStart(2, '0')}`;
};

const windowDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = Temporal.PlainDate.from(props.windowStart).add({ days: index });
  const workedMinutes = props.daysByDate[date.toString()]?.workedMinutes ?? 0;
  return {
    date: date.toString(),
    letter: LETTERS[date.dayOfWeek - 1],
    workedMinutes,
    height: Math.max(3, Math.round(percent(workedMinutes, BAR_SCALE_MINUTES) * BAR_MAX_HEIGHT / 100)),
  };
}));
const daysSummary = computed(() => windowDays.value.map((day) => `${formatDayShort(day.date)} ${formatHours(day.workedMinutes)}`).join(', '));
</script>

<style scoped>
.tabular {
  font-variant-numeric: tabular-nums;
}

/* Verdict : icône + texte, teinte du thème (jamais la teinte seule) */
.verdict {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
}

.verdict--ok {
  background: color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, transparent);
}

.verdict--ko {
  background: color-mix(in srgb, rgb(var(--v-theme-error)) 18%, transparent);
  color: rgb(var(--v-theme-error));
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  align-items: end;
}

.day-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
  min-width: 0;
}

.day-bar {
  width: 100%;
  max-width: 22px;
  border-radius: 4px 4px 2px 2px;
  background: rgb(var(--v-theme-primary));
}

.day-bar--empty {
  background: color-mix(in srgb, rgb(var(--v-theme-onSurface)) 14%, transparent);
}

.day-bar-value {
  font-size: 10px;
  line-height: 1;
  min-height: 10px;
  color: color-mix(in srgb, rgb(var(--v-theme-onSurface)) 70%, transparent);
}

.day-bar-label {
  color: color-mix(in srgb, rgb(var(--v-theme-onSurface)) 60%, transparent);
}
</style>
