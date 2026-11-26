<template>
  <div
    class="d-flex cursor-pointer overflow-hidden day-block tile pa-2"
    role="button"
    tabindex="0"
    :aria-pressed="selected"
    :style="{ height: height + 'px ' }"
    :class="{
      isWorkDay: isWorkDay,
      isRestDay: !!shiftName && !isWorkDay,
      [dayKindClass(kind)]: !!kind,
      'is-past': inPast,
      selected: selected,
      'in-period': inPeriod,
      'day--today': isToday,
      'empty-day': !isInMonth,
    }"
    @click="handleClick"
    @keydown.enter.prevent="handleClick"
    @keydown.space.prevent="handleClick"
  >
    <!-- Date number + shift name row -->
    <div class="d-flex justify-space-between align-start px-0 day-header overflow-hidden" style="min-width: 0;">
      <!-- Day number -->
      <div class="day_label_container align-center" :class="inPast ? 'text-disabled' : ''">
        <span class="day-number" :class="{ 'today-pill': isToday, xs: xs }">
          {{ date.day }}
        </span>
      </div>

      <!-- Shift info : travail ET repos (R1, R6…) — en haut à droite -->
      <div class="shift_container align-center" :class="inPast ? 'text-disabled' : ''">
        <!-- Affectation (formation, bureau, congé...) : son icône prend la place du nom de la vacation de base -->
        <div v-if="icon" class="d-flex shift-name day-icon align-center" :title="shiftName">
          <v-icon size="14px">{{ icon }}</v-icon>
        </div>
        <div v-else-if="shiftName" class="d-flex align-center shift-row" :class="dayPresenceClasses(presence)">
          <span class="shift-name" :class="{ xs: xs }">{{ shiftName }}</span>
          <div v-if="selectedVariation || presence !== 'present'" class="dot dot--2xs" />
          <span v-if="variationLabel" class="variation-name" :class="{ xs: xs }">
            {{ variationLabel }}
          </span>
          <!-- <v-icon v-else-if="presence !== 'present'" size="10px">mdi-cancel</v-icon> -->
        </div>
      </div>
    </div>

    <!-- Sous la date, hors de l'en-tête (pour ne pas rétrécir le nom de la vacation) : repos insuffisant avant la vacation de
             ce jour, et commentaire de l'affectation du jour (une ligne, le texte complet en infobulle) -->
    <div v-if="restProblem || comment" class="day-indicators">
      <span v-if="restProblem" class="rest-flag" role="img" :aria-label="restLabel">
        <v-icon size="10">mdi-sleep-off</v-icon>
        <v-tooltip activator="parent" location="top" :text="restLabel" />
      </span>
      <span v-if="comment" class="day-comment" :title="comment">{{ comment }}</span>
    </div>

    <!-- Périodes de 7 jours en défaut : une ligne pleine pour plus de 48 h de travail, en pointillé pour un repos de 35 h manquant -->
    <div
      v-for="line in windowLines"
      :key="line.issue"
      class="window-line-hit"
      :class="`window-line-hit--${line.issue}`"
      role="button"
      tabindex="0"
      :aria-label="line.label"
      @click.stop="emit('inspect-window', line.windows[0])"
      @keydown.enter.stop.prevent="emit('inspect-window', line.windows[0])"
    >
      <span
        class="window-line"
        :class="[`window-line--${line.issue}`, { 'cap-start': line.capStart, 'cap-end': line.capEnd }]"
      />
      <v-tooltip activator="parent" location="top" :text="line.label" />
    </div>

    <!-- Demand chips (bottom-right) -->
    <div class="d-flex justify-center position-absolute mb-1 mr-1" style="bottom: 0; right: 0">
      <div v-for="(demand, index) in demands" :key="demand.id">
        <DemandChip :order="index + 1" :demand="demand" />
      </div>
      <div v-if="demands.length > 1" class="chipe position-absolute" style="top: 50%; left: -5px">
        <v-icon size="14px" color="onPrimary">mdi-plus</v-icon>
      </div>
    </div>

    <!-- Indicator dots (bottom-left) -->
    <div style="bottom: 8px; left: 8px;" class="d-flex justify-center position-absolute">
      <div class="d-flex justify-center ga-1">
        <div v-if="hasAvailableSubstitutions" class="dot dot--primary remplacement" />
        <div v-if="hasAvailableSwitches" class="dot dot--primary permutation" />
        <div v-if="hasOtherDemands" class="dot dot--error dot--soft other-demand" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useDisplay } from 'vuetify';
import { formatHours } from '@/utils/workWindows';
import { dayKindClass, dayPresenceClasses } from '@/utils/dayStyle';

const { xs } = useDisplay();

const props = defineProps({
  /** The Date object for this day cell */
  date: {
    type: Temporal.PlainDate,
    required: true,
  },
  /** Whether this day is inside the currently displayed month */
  isInMonth: {
    type: Boolean,
    default: true,
  },
  /** Whether this day is today */
  isToday: {
    type: Boolean,
    default: false,
  },
  /** Whether this day is currently selected */
  selected: {
    type: Boolean,
    default: false,
  },

  // ── Shift data ──────────────────────────────────────────────────────────────
  isWorkDay: {
    type: Boolean,
    default: false,
  },
  /** 'present' | 'released' (dispo) | 'unconfirmed' (jour facultatif non confirmé) | 'replaced' : tout sauf présent s'affiche barré */
  presence: {
    type: String,
    default: 'present',
  },
  shiftName: {
    type: String,
    default: null,
  },
  /** The raw selectedVariation object (or the string 'vic') */
  selectedVariation: {
    default: null,
  },
  variationName: {
    type: String,
    default: null,
  },
  /** Nature du jour (utils/dayStyle.js dayKindOf) : 'work', 'vic', 'leave', 'entry' ou 'rest', qui donne sa couleur à la tuile (styles/day.css) */
  kind: {
    type: String,
    default: null,
  },
  /** mdi icon string for non-shift entry types, e.g. 'mdi-beach' */
  icon: {
    type: String,
    default: null,
  },

  // ── Demand chips ────────────────────────────────────────────────────────────
  demands: {
    type: Array,
    default: () => [],
  },

  // ── Indicator dots ──────────────────────────────────────────────────────────
  hasAvailableSubstitutions: {
    type: Boolean,
    default: false,
  },
  hasAvailableSwitches: {
    type: Boolean,
    default: false,
  },
  hasOtherDemands: {
    type: Boolean,
    default: false,
  },
  height: {
    type: Number,
    default: 64,
  },

  // ── Contrôle du temps de travail (voir stores/workCheckStore.js) ──────────────────────────────────────────────
  /** Commentaire de l'affectation du jour ('' : aucun) */
  comment: {
    type: String,
    default: '',
  },
  /** Repos avant la vacation du jour : { minutes, requiredMinutes, ok } */
  rest: {
    type: Object,
    default: null,
  },
  /** Lignes sous le jour : [{ issue: 'work'|'rest', capStart, capEnd, windows: [début…], label }] */
  windowLines: {
    type: Array,
    default: () => [],
  },
  /** Jour à l'intérieur de la période choisie (les bornes sont `selected`) */
  inPeriod: {
    type: Boolean,
    default: false,
  },
});

import { Temporal } from 'temporal-polyfill';

import { useCenterStore } from '@/stores/centerStore';
const DEFAULT_TIME_ZONE = 'Europe/Paris';

const centerStore = useCenterStore();
const centerId = 'aze';

const emit = defineEmits(['select', 'inspect-window']);

const restProblem = computed(() => Boolean(props.rest) && !props.rest.ok);
const restLabel = computed(() =>
  props.rest
    ? `Repos de ${formatHours(props.rest.minutes)} avant la vacation de ce jour (minimum ${formatHours(props.rest.requiredMinutes)})`
    : '',
);

/** Journée en VIC : la tuile prend la couleur secondaire (un jour travaillé est primaire) */
const isVic = computed(() => props.selectedVariation === 'vic');

/** Évite de doubler la variante déjà concaténée dans shiftName (ex. J1A). */
const variationLabel = computed(() => {
  if (isVic.value) return 'VIC';
  const variation = props.variationName;
  if (!variation) return '';
  const shift = props.shiftName || '';
  if (shift.endsWith(variation)) return '';
  return variation;
});

const timeZone = computed(() => centerStore.centers.find((c) => c._id === centerId)?.timeZone || DEFAULT_TIME_ZONE);

const today = Temporal.Now.plainDateISO(timeZone.value).toString();

const isToday = computed(() => Temporal.PlainDate.compare(props.date, today) === 0);

const inPast = computed(() => {
  if (!props.date) return false;
  const today = Temporal.Now.plainDateISO();
  return Temporal.PlainDate.compare(props.date, today) < 0;
});

const handleClick = async () => {
  emit('select', props.date);
  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics indisponible sur le web / desktop
  }
};
</script>

<style scoped>
.chipe {
  height: 14px;
  width: 14px;
  transform: translateY(-50%) translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 1) !important;
  border-radius: 8px !important;
}

/* Les utilitaires de la tuile (d-flex, pa-2, overflow-hidden) imposent affichage, marge intérieure et débordement :
   ils ne sont pas répétés ici. */

/* ── Tuile ───────────────────────────────────────────────────────────────────── */
.day-block {
  /* Tuile globale (styles/tile.css) : fond, bordure, survol, focus et état sélectionné en viennent ; on ne règle ici que
       ce qui est propre au calendrier. Couleur : jour travaillé = primaire (accent par défaut de la tuile), VIC = secondaire. */
  --tile-radius: 12px;
  position: relative;
  width: 100% !important;
  min-width: 0;
  min-height: 0; /* la hauteur vient de la prop `height`, pas des 84 px minimum de la tuile */
  transition:
    border-radius var(--motion-expressive-default-effects),
    background var(--motion-standard-fast-effects),
    color var(--motion-standard-fast-effects),
    border-color var(--motion-standard-fast-effects),
    box-shadow var(--motion-standard-fast-effects),
    transform var(--motion-standard-fast-effects);
}

/* Accent (travail, VIC, congé, autre affectation), teinte de repos, présence et « aujourd'hui » : classes globales de styles/day.css */

/* Jour à l'intérieur de la période choisie : teinte de l'accent (les bornes sont pleines, comme une tuile sélectionnée).
   Plus spécifique que la teinte de repos de styles/day.css. */
.in-period:not([aria-pressed='true']) {
  --tile-bg: color-mix(in srgb, var(--tile-accent) 28%, transparent);
  --tile-border: color-mix(in srgb, var(--tile-accent) 55%, transparent);
}

/* Tuile sélectionnée : coins plus arrondis (le fond plein vient de la tuile, via aria-pressed) */
.selected {
  --tile-radius: 16px;
}

.empty-day {
  opacity: 0.45;
}

/* ── En-tête : numéro du jour, nom de la vacation ────────────────────────────── */
.day-header {
  gap: 4px;
  width: 100%;
}

.day_label_container {
  display: flex;
  justify-content: flex-start;
}

/* Poids du numéro : 500 par défaut, 900 un jour travaillé à venir, 400 un jour de repos */
.day-number {
  position: relative;
  font-size: 13px !important;
  font-weight: 500;
  line-height: 1.1;
}

.day-number.xs {
  font-size: 12px !important;
}

.isWorkDay:not(.is-past) .day-number {
  font-weight: 900;
}

.isRestDay .day-number {
  font-weight: 400;
  opacity: 0.95;
}

.shift_container {
  display: flex;
  justify-content: flex-end;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 70%;
  overflow: hidden;
  white-space: nowrap;
}

.shift-row {
  gap: 3px;
  min-width: 0;
  max-width: 100%;
  justify-content: flex-end;
}

.shift-name {
  font-size: 12px !important;
  font-weight: 700 !important;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.shift-name.xs {
  font-size: 11px !important;
}

/* Jour de repos (R1, R6…) : le nom s'efface, le numéro reste */
.isRestDay .shift-name {
  font-weight: 500 !important;
  opacity: 0.01;
}

.variation-name {
  display: flex;
  align-items: center;
  font-size: 11px !important;
  font-weight: 600 !important;
  opacity: 0.85;
  white-space: nowrap;
  min-width: 0;
}

.variation-name.xs {
  font-size: 10px !important;
}

/* Tuile sélectionnée : texte « sur accent » (après les règles de repos et d'absence, à spécificité égale la dernière compte) */
.selected .shift-name,
.selected .variation-name,
.selected .day-number {
  color: var(--tile-on-accent) !important;
  opacity: 1;
}

/* ── Contrôle du temps de travail ────────────────────────────────────────────── */
/* Ligne sous la date, positionnée à part : elle ne change pas la largeur de l'en-tête */
.day-indicators {
  position: absolute;
  left: 8px;
  top: 27px;
  display: flex;
  align-items: center;
  gap: 3px;
  right: 6px;
  pointer-events: none;
}

/* Les éléments qui ont une infobulle reprennent les événements (le clic remonte quand même à la tuile) */
.day-indicators .rest-flag,
.day-indicators .day-comment {
  pointer-events: auto;
}

/* Commentaire : une ligne, tronquée par une ellipse */
.day-comment {
  min-width: 0;
  overflow: hidden;
  font-size: 10.5px;
  line-height: 1.2;
  opacity: 0.7;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Pastille d'alerte : lisible sur toutes les teintes de la tuile, sélectionnée ou non */
.rest-flag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: rgb(var(--v-theme-error));
  color: rgb(var(--v-theme-onError));
}

/* Lignes des périodes de 7 jours en défaut : la zone cliquable (9 px) est plus haute que le trait (3 px) */
.window-line-hit {
  position: absolute;
  left: 0;
  right: 0;
  height: 9px;
  cursor: help;
  outline: none;
}

.window-line-hit--work {
  bottom: 0;
}
.window-line-hit--rest {
  bottom: 8px;
}

.window-line-hit:focus-visible .window-line {
  outline: 2px solid var(--tile-accent);
  outline-offset: 1px;
}

.window-line {
  position: absolute;
  bottom: 3px;
  left: 0;
  right: 0;
  height: 3px;
  background: rgb(var(--v-theme-error));
}

/* Pas de couleur seule : plus de 48 h = trait plein, repos de 35 h manquant = pointillés */
.window-line--rest {
  background: repeating-linear-gradient(90deg, rgb(var(--v-theme-error)) 0 6px, transparent 6px 9px);
}

.window-line.cap-start {
  left: 8px;
  border-top-left-radius: 2px;
  border-bottom-left-radius: 2px;
}
.window-line.cap-end {
  right: 8px;
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}
</style>
