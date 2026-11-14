<template>
    <div class="d-flex cursor-pointer overflow-hidden day-block tile pa-2" role="button" tabindex="0"
        :aria-pressed="selected" :style="{ height: height + 'px ' }" :class="{
        'isWorkDay': isWorkDay,
        'isRestDay': !!shiftName && !isWorkDay,
        'isVic': isVic,
        'selected': selected,
        'in-period': inPeriod,
        'today-center-highlight': isToday,
        'empty-day': !isInMonth,
    }" @click="handleClick" @keydown.enter.prevent="handleClick" @keydown.space.prevent="handleClick">
        <!-- Date number + shift name row -->
        <div class="d-flex justify-space-between align-start px-0 day-header" style="min-width: 0; overflow: hidden;">
            <!-- Day number -->
            <div class="day_label_container align-center" :class="inPast ? 'text-disabled' : ''">
                <span 
                     class="day-number"
                    :class="{ 'tg-day--today': isToday, 'tg-day--weekend': false, 'xs': xs }"
                    :style="isWorkDay && !inPast ? 'font-weight: 900 !important' : 'font-weight: 500'"
                    >
                    {{ date.day }}
                </span>
            </div>

            <!-- Shift info : travail ET repos (R1, R6…) — en haut à droite -->
            <div class="shift_container align-center" :class="inPast ? 'text-disabled' : ''">
                <div v-if="shiftName" class="d-flex align-center shift-row" :class="isOff ? 'offDay' : ''">
                    <span class="shift-name" :class="{ 'xs': xs, 'rest': !isWorkDay }">{{ shiftName }}</span>
                    <div v-if="selectedVariation || isOff" class="mod-dot" />
                    <span v-if="variationLabel" class="variation-name" :class="{ 'xs': xs }">
                        {{ variationLabel }}
                    </span>
                    <v-icon v-else-if="isOff" size="10px">mdi-cancel</v-icon>
                </div>
                <div v-else-if="icon" class="d-flex shift-name align-center">
                    <v-icon size="12px">{{ icon }}</v-icon>
                </div>
            </div>
        </div>

        <!-- Sous la date, hors de l'en-tête (pour ne pas rétrécir le nom de la vacation) : repos insuffisant avant la vacation de
             ce jour, et temps travaillé (une nuit compte en entier le jour où elle commence) -->
        <div v-if="restProblem || workedMinutes > 0" class="day-indicators">
            <span v-if="restProblem" class="rest-flag" role="img" :aria-label="restLabel">
                <v-icon size="10">mdi-sleep-off</v-icon>
                <v-tooltip activator="parent" location="top" :text="restLabel" />
            </span>
            <span v-if="workedMinutes > 0" class="worked-time" :title="formatHours(workedMinutes)">{{ formatCompactHours(workedMinutes) }}</span>
        </div>

        <!-- Périodes de 7 jours en défaut : une ligne pleine pour plus de 48 h de travail, en pointillé pour un repos de 35 h manquant -->
        <div v-for="line in windowLines" :key="line.issue" class="window-line-hit" :class="`window-line-hit--${line.issue}`"
            role="button" tabindex="0" :aria-label="line.label" @click.stop="emit('inspect-window', line.windows[0])"
            @keydown.enter.stop.prevent="emit('inspect-window', line.windows[0])">
            <span class="window-line" :class="[`window-line--${line.issue}`, { 'cap-start': line.capStart, 'cap-end': line.capEnd }]" />
            <v-tooltip activator="parent" location="top" :text="line.label" />
        </div>

        <!-- Demand chips (bottom-right) -->
        <div class="d-flex justify-center position-absolute mb-1 mr-1" style="bottom: 0; right: 0;">
            <div v-for="(demand, index) in demands" :key="demand.id">
                <DemandChip :order="index + 1" :demand="demand" :date="date.toString()" />
            </div>
            <div v-if="demands.length > 1" class="chipe position-absolute" style="top: 50%; left: -5px;">
                <v-icon size="14px" color="onPrimary">mdi-plus</v-icon>
            </div>
        </div>

        <!-- Indicator dots (bottom-left) -->
        <div style="position: absolute; bottom: 8px; left: 8px" class="d-flex justify-center">
            <div class="d-flex justify-center ga-1">
                <div v-if="hasAvailableSubstitutions" class="indicator-dot remplacement"
                    style="background: rgb(var(--v-theme-primary)) !important" />
                <div v-if="hasAvailableSwitches" class="indicator-dot permutation"
                    style="background: rgb(var(--v-theme-primary)) !important" />
                <div v-if="hasOtherDemands" class="indicator-dot other-demand"
                    style="background: rgba(var(--v-theme-error), .3) !important" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useDisplay } from 'vuetify';
import { formatCompactHours, formatHours } from '@/utils/workWindows';

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
    isOff: {
        type: Boolean,
        default: false,
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
    /** Minutes travaillées ce jour (null : pas de donnée) */
    workedMinutes: {
        type: Number,
        default: null,
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

import { Temporal } from '@js-temporal/polyfill';
import { useRoute } from 'vue-router';

import { useCenterStore } from '@/stores/centerStore';
const DEFAULT_TIME_ZONE = 'Europe/Paris';
const route = useRoute();

const centerStore = useCenterStore();
const centerId = "aze"

const emit = defineEmits(['select', 'inspect-window']);

const restProblem = computed(() => Boolean(props.rest) && !props.rest.ok);
const restLabel = computed(() => (props.rest
    ? `Repos de ${formatHours(props.rest.minutes)} avant la vacation de ce jour (minimum ${formatHours(props.rest.requiredMinutes)})`
    : ''));

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

const today =  Temporal.Now.plainDateISO(timeZone.value).toString();

const isToday = computed(() =>  Temporal.PlainDate.compare(props.date, today) ===0)

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
.offDay {
    color: rgb(var(--v-theme-error)) !important;
    opacity: 0.75 !important;
}

.day-block {
    /* Tuile globale (styles/tile.css) : fond, bordure, survol, focus et état sélectionné en viennent ; on ne règle ici que
       ce qui est propre au calendrier. Couleur : jour travaillé = primaire (accent par défaut de la tuile), VIC = secondaire. */
    --tile-radius: 12px;
    width: 100% !important;
    position: relative;
    padding-top: 6px;
    min-width: 0;
    min-height: 0;   /* la hauteur vient de la prop `height`, pas des 84 px minimum de la tuile */
    overflow: hidden;
    display: grid;
    transition: border-radius var(--motion-expressive-default-effects),
        background var(--motion-standard-fast-effects),
        color var(--motion-standard-fast-effects),
        border-color var(--motion-standard-fast-effects),
        box-shadow var(--motion-standard-fast-effects),
        transform var(--motion-standard-fast-effects);
}

/* VIC : l'accent de la tuile (survol, focus, fond une fois sélectionnée) passe au secondaire */
.isVic {
    --tile-accent: rgb(var(--v-theme-secondary));
    --tile-on-accent: rgb(var(--v-theme-onSecondary));
}

/* Teinte légère de l'accent au repos pour un jour travaillé ou en VIC ; sélectionnée, c'est l'accent plein (tuile) */
.isWorkDay:not([aria-pressed='true']),
.isVic:not([aria-pressed='true']) {
    --tile-bg: color-mix(in srgb, var(--tile-accent) 10%, transparent);
}

.day-header {
    gap: 4px;
    width: 100%;
}

.mod-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background-color: rgba(var(--v-theme-onSurface), 0.5);
    flex-shrink: 0;
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
    color: rgb(var(--v-theme-onSurface));
    opacity: 1;
}

.shift-name.xs {
    font-size: 11px !important;
}

.shift-name.rest {
    font-weight: 500 !important;
    opacity: 0.55;
}

.variation-name {
    display: flex;
    align-items: center;
    font-size: 11px !important;
    font-weight: 600 !important;
    opacity: 0.85;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
}

.variation-name.xs {
    font-size: 10px !important;
}

.isWorkDay {
    opacity: 1;
}

.isRestDay .day-number {
    opacity: 0.95;
    font-weight: 400 !important;
}

.isRestDay .shift-name {
    font-weight: 500 !important;
    opacity: 0.01;
}

.indicator-dot {
    height: 8px;
    width: 8px;
    border-radius: 8px;
}

/* Tuile sélectionnée : coins plus arrondis (le fond plein vient de la tuile, via aria-pressed) */
.selected {
    --tile-radius: 16px;
}

.selected .shift-name,
.selected .variation-name,
.selected .day-number {
    color: var(--tile-on-accent) !important;
    opacity: 1;
}

.day_label_container {
    justify-content: flex-start;
    display: flex;
}

/* Ligne sous la date, positionnée à part : elle ne change pas la largeur de l'en-tête */
.day-indicators {
    position: absolute;
    left: 8px;
    top: 27px;
    display: flex;
    align-items: center;
    gap: 3px;
    max-width: calc(100% - 8px);
    pointer-events: none;
}

.day-indicators .rest-flag {
    pointer-events: auto;
}

.worked-time {
    font-size: 10.5px;
    line-height: 1.2;
    font-variant-numeric: tabular-nums;
    opacity: 0.7;
    white-space: nowrap;
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

.window-line-hit--work { bottom: 0; }
.window-line-hit--rest { bottom: 8px; }

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

.window-line.cap-start { left: 8px; border-top-left-radius: 2px; border-bottom-left-radius: 2px; }
.window-line.cap-end { right: 8px; border-top-right-radius: 2px; border-bottom-right-radius: 2px; }

/* Jour à l'intérieur de la période choisie : teinte de l'accent (les bornes sont pleines, comme une tuile sélectionnée) */
.in-period:not([aria-pressed='true']) {
    --tile-bg: color-mix(in srgb, var(--tile-accent) 28%, transparent);
    --tile-border: color-mix(in srgb, var(--tile-accent) 55%, transparent);
}

.day-number {
    position: relative;
    font-size: 13px !important;
    line-height: 1.1;
}

.day-number.xs {
    font-size: 12px !important;
}

.today-center-highlight:not(.selected) {
    border: 1.5px solid rgba(var(--v-theme-primary), 0.55) !important;
}

.empty-day {
    opacity: 0.45;
}


.tg-day--today  {
  min-width: 24px;
  padding: 2px 0;
  text-align: center;
  border-radius: 12px;
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-onPrimary));
}


.shift_container {
    display: flex;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: flex-end;
    min-width: 0;
    flex: 1 1 auto;
    max-width: 70%;
}
</style>