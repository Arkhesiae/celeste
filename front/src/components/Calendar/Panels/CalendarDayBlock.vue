<template>
    <div class="d-flex cursor-pointer overflow-hidden day-block tile pa-2" role="button" tabindex="0"
        :aria-pressed="selected" :style="{ height: height + 'px ' }" :class="{
        'isWorkDay': isWorkDay,
        'isRestDay': !!shiftName && !isWorkDay,
        'isVic': isVic,
        'is-past': inPast,
        'isLeave': entryKind === 'leave',
        'isEntry': entryKind === 'entry',
        'selected': selected,
        'in-period': inPeriod,
        'today-center-highlight': isToday,
        'empty-day': !isInMonth,
    }" @click="handleClick" @keydown.enter.prevent="handleClick" @keydown.space.prevent="handleClick">
        <!-- Date number + shift name row -->
        <div class="d-flex justify-space-between align-start px-0 day-header" style="min-width: 0; overflow: hidden;">
            <!-- Day number -->
            <div class="day_label_container align-center" :class="inPast ? 'text-disabled' : ''">
                <span class="day-number" :class="{ 'tg-day--today': isToday, 'xs': xs }">
                    {{ date.day }}
                </span>
            </div>

            <!-- Shift info : travail ET repos (R1, R6…) — en haut à droite -->
            <div class="shift_container align-center" :class="inPast ? 'text-disabled' : ''">
                <!-- Affectation (formation, bureau, congé...) : son icône prend la place du nom de la vacation de base -->
                <div v-if="icon" class="d-flex shift-name align-center" :title="shiftName">
                    <v-icon size="14px">{{ icon }}</v-icon>
                </div>
                <div v-else-if="shiftName" class="d-flex align-center shift-row" :class="presence !== 'present' ? 'offDay' : ''">
                    <span class="shift-name" :class="{ 'xs': xs, 'absence': isAbsence }">{{ shiftName }}</span>
                    <div v-if="selectedVariation || presence !== 'present'" class="dot dot--2xs" />
                    <span v-if="variationLabel" class="variation-name" :class="{ 'xs': xs }">
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
    /** Affectation du jour : 'leave' (congé) ou 'entry' (toute autre), qui donne sa couleur à la tuile */
    entryKind: {
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

const isAbsence = computed(() => ['unconfirmed', 'released'].includes(props.presence))

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
    min-height: 0;   /* la hauteur vient de la prop `height`, pas des 84 px minimum de la tuile */
    transition: border-radius var(--motion-expressive-default-effects),
        background var(--motion-standard-fast-effects),
        color var(--motion-standard-fast-effects),
        border-color var(--motion-standard-fast-effects),
        box-shadow var(--motion-standard-fast-effects),
        transform var(--motion-standard-fast-effects);
}

/* Accent : VIC = secondaire ; affectations = une couleur pour les congés, une seule pour toutes les autres */
.isVic {
    --tile-accent: rgb(var(--v-theme-secondary));
    --tile-on-accent: rgb(var(--v-theme-onSecondary));
}

.isLeave {
    --tile-accent: rgb(var(--v-theme-leave));
    --tile-on-accent: rgb(var(--v-theme-onLeave));
}

.isEntry {
    --tile-accent: rgb(var(--v-theme-entry));
    --tile-on-accent: rgb(var(--v-theme-onEntry));
}

/* Teinte légère de l'accent au repos pour un jour travaillé, en VIC ou d'affectation ; sélectionnée, c'est l'accent plein (tuile) */
.isWorkDay:not([aria-pressed='true']),
.isVic:not([aria-pressed='true']),
.isLeave:not([aria-pressed='true']),
.isEntry:not([aria-pressed='true']) {
    --tile-bg: color-mix(in srgb, var(--tile-accent) 10%, transparent);
}

/* Jour à l'intérieur de la période choisie : teinte de l'accent (les bornes sont pleines, comme une tuile sélectionnée).
   Après la teinte de repos ci-dessus : à spécificité égale, c'est la dernière qui compte. */
.in-period:not([aria-pressed='true']) {
    --tile-bg: color-mix(in srgb, var(--tile-accent) 28%, transparent);
    --tile-border: color-mix(in srgb, var(--tile-accent) 55%, transparent);
}

/* Tuile sélectionnée : coins plus arrondis (le fond plein vient de la tuile, via aria-pressed) */
.selected {
    --tile-radius: 16px;
}

/* Aujourd'hui : contour de l'accent (teinte par color-mix : le primaire est en hexadécimal à 8 chiffres, rgba(var(...), a) y est invalide) */
.today-center-highlight:not(.selected) {
    border: 1.5px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 55%, transparent) !important;
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

/* Aujourd'hui : le numéro est une pastille */
.tg-day--today {
    min-width: 24px;
    padding: 2px 0;
    text-align: center;
    border-radius: 12px;
    background: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-onPrimary));
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
    color: rgb(var(--v-theme-onSurface));
}

.shift-name.xs {
    font-size: 11px !important;
}

/* Jour de repos (R1, R6…) : le nom s'efface, le numéro reste */
.isRestDay .shift-name {
    font-weight: 500 !important;
    opacity: 0.01;
}

/* L'icône d'affectation prend la couleur de l'accent au repos (sélectionnée, elle prend la couleur « sur accent » ci-dessous) */
.isLeave:not(.selected) .shift-name,
.isEntry:not(.selected) .shift-name {
    color: var(--tile-accent);
}

/* Pas présent (dispo, jour facultatif non confirmé, remplacé) : la ligne est atténuée et rouge ; le nom l'est aussi pour une
   dispo ou un jour non confirmé (`absence`) ; un remplacé garde la couleur normale du nom, simplement atténué */
.offDay {
    color: rgb(var(--v-theme-error)) !important;
    opacity: 0.75 !important;
}

.absence {
    color: rgb(var(--v-theme-error)) !important;
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
</style>