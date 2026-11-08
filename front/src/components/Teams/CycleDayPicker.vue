<template>
  <div>
    <!-- Un jour du tour de service par tuile : jour, vacation, horaires, et l'équipe qui l'occupe déjà -->
    <div class="cdp-grid ga-2" role="radiogroup" aria-label="Jour du tour de service">
      <button
        v-for="day in days"
        :key="day.position"
        type="button"
        role="radio"
        :aria-checked="modelValue === day.position"
        class="tile"
        :class="{ 'tile--muted': day.isRest }"
        @click="modelValue = day.position"
      >
        <span class="cdp-tile__position text-uppercase opacity-70">Jour {{ day.position }}</span>
        <span class="cdp-tile__name font-weight-bold">{{ day.name || '—' }}</span>
        <span class="cdp-tile__hours opacity-70">{{ day.hours || (day.isRest ? 'Repos' : '') }}</span>

        <span v-if="currentPosition === day.position" class="cdp-tile__badge cdp-tile__badge--current position-absolute d-inline-flex align-center ga-1 px-2 text-truncate font-weight-bold">Actuel</span>
        <span v-else-if="occupants[day.position]" class="cdp-tile__badge position-absolute d-inline-flex align-center ga-1 px-2 text-truncate font-weight-bold" :title="`Occupé par l'équipe ${occupants[day.position]}`">
          <v-icon size="11">mdi-swap-horizontal</v-icon>
          {{ occupants[day.position] }}
        </span>
      </button>
    </div>

    <!-- Aperçu : ce que l'équipe ferait sur les prochains jours avec ce choix -->
    <div v-if="preview.length" class="mt-4">
      <div class="text-label-medium text-medium-emphasis mb-1">
        Aperçu des {{ preview.length }} prochains jours
      </div>
      <div class="cdp-preview d-flex ga-1 pb-1 overflow-x-auto">
        <div
          v-for="item in preview"
          :key="item.key"
          class="cdp-preview__day d-flex flex-column align-center py-1"
          :class="{ 'cdp-preview__day--today': item.isToday, 'cdp-preview__day--rest': item.isRest }"
        >
          <span class="cdp-preview__weekday text-uppercase opacity-70">{{ item.weekday }}</span>
          <span class="cdp-preview__date font-weight-bold">{{ item.day }}</span>
          <span class="cdp-preview__shift font-weight-bold">{{ item.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Temporal } from '@js-temporal/polyfill';

const props = defineProps({
  /** Jours du tour de service : [{ position (1..N), name, isRest, hours }] */
  days: { type: Array, default: () => [] },
  /** Équipes qui occupent déjà un jour (hors l'équipe éditée) : { [position]: nomDeLEquipe } */
  occupants: { type: Object, default: () => ({}) },
  /** Position actuelle de l'équipe éditée, repérée par un badge */
  currentPosition: { type: Number, default: null },
  /** Fuseau horaire du centre : « aujourd'hui » de l'aperçu */
  timeZone: { type: String, default: 'Europe/Paris' },
});

const PREVIEW_DAYS = 7;

const modelValue = defineModel({ type: Number, default: null });

const preview = computed(() => {
  if (!modelValue.value || props.days.length === 0) return [];

  const today = Temporal.Now.plainDateISO(props.timeZone);
  const total = props.days.length;
  return Array.from({ length: PREVIEW_DAYS }, (_, index) => {
    const date = today.add({ days: index });
    const day = props.days[(modelValue.value - 1 + index) % total];
    return {
      key: date.toString(),
      weekday: date.toLocaleString('fr-FR', { weekday: 'narrow' }),
      day: date.day,
      name: day.name || `J${day.position}`,
      isRest: day.isRest,
      isToday: index === 0,
    };
  });
});
</script>

<style scoped>
/* Vuetify n'a pas de classe d-grid */
.cdp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
}

.cdp-tile__position { font-size: 10px; }
.cdp-tile__name { font-size: 18px; line-height: 1.1; }
.cdp-tile__hours { font-size: 11px; }

.cdp-tile__badge {
  top: 6px;
  right: 6px;
  max-width: calc(100% - 12px);
  font-size: 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-onSurface), 0.1);
}

.cdp-tile__badge--current {
  background: var(--tile-accent);
  color: var(--tile-on-accent);
}

/* Sur la tuile sélectionnée (déjà pleine de la couleur d'accent), le badge s'inverse pour rester lisible */
.tile[aria-checked='true'] .cdp-tile__badge--current {
  background: var(--tile-on-accent);
  color: var(--tile-accent);
}

.cdp-preview__day {
  flex: 0 0 38px;
  border-radius: 10px;
  background: rgba(var(--v-theme-onSurface), 0.04);
  line-height: 1.15;
}

.cdp-preview__day--today { background: rgba(var(--v-theme-primary), 0.15); }
.cdp-preview__day--rest { color: rgb(var(--v-theme-onSurfaceVariant)); }

.cdp-preview__weekday { font-size: 9px; }
.cdp-preview__date { font-size: 12px; }
.cdp-preview__shift { font-size: 11px; }
</style>
