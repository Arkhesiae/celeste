<template>
    <div class="d-flex cursor-pointer overflow-hidden day-block" :style="{ height: height + 'px ' }" :class="{
        'isWorkDay': isWorkDay,
        'isRestDay': !!shiftName && !isWorkDay,
        'selected': selected,
        'today-center-highlight': isToday,
        'empty-day': !isInMonth,
    }" @click="handleClick">
        <!-- Date number + shift name row -->
        <div class="d-flex justify-space-between align-start px-2 day-header" style="min-width: 0; overflow: hidden;">
            <!-- Day number -->
            <div class="day_label_container align-center" :class="inPast ? 'text-disabled' : ''">
                <span class="day-number"
                    :style="isWorkDay && !inPast ? 'font-weight: 900 !important' : 'font-weight: 500'"
                    :class="{ 'xs': xs }">
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
});

const emit = defineEmits(['select']);

/** Évite de doubler la variante déjà concaténée dans shiftName (ex. J1A). */
const variationLabel = computed(() => {
    if (props.selectedVariation === 'vic') return 'VIC';
    const variation = props.variationName;
    if (!variation) return '';
    const shift = props.shiftName || '';
    if (shift.endsWith(variation)) return '';
    return variation;
});

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
    width: 100% !important;
    position: relative;
    padding-top: 6px;
    min-width: 0;
    overflow: hidden;
    background-color: rgb(var(--v-theme-surfaceContainerHigh));
    border: 1px solid rgba(var(--v-theme-outlineVariant), 0.85);
    display: grid;
    flex-direction: column;
    border-radius: 12px;
    transition: border-radius var(--motion-expressive-default-effects),
        border-color var(--motion-expressive-default-effects),
        background-color var(--motion-expressive-default-effects);
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

.isRestDay {
    background-color: rgb(var(--v-theme-surfaceContainerLow));
    border-color: rgba(var(--v-theme-outlineVariant), 0.4);
}

.isRestDay .day-number {
    opacity: 0.55;
    font-weight: 400 !important;
}

.isRestDay .shift-name {
    font-weight: 500 !important;
    opacity: 0.5;
}

.indicator-dot {
    height: 8px;
    width: 8px;
    border-radius: 8px;
}

.selected {
    border-radius: 16px !important;
    color: rgb(var(--v-theme-onPrimary)) !important;
    background: rgb(var(--v-theme-primary)) !important;
    border-color: rgb(var(--v-theme-primary)) !important;
}

.selected .shift-name,
.selected .variation-name,
.selected .day-number {
    color: rgb(var(--v-theme-onPrimary)) !important;
    opacity: 1;
}

.selected.isRestDay {
    background: rgb(var(--v-theme-primary)) !important;
    border-color: rgb(var(--v-theme-primary)) !important;
}

.day_label_container {
    justify-content: flex-start;
    display: flex;
}

.day-number {
    position: relative;
    font-size: 13px !important;
    line-height: 1.1;
}

.day-number.xs {
    font-size: 12px !important;
}

.today-center-highlight {
    border: 1.5px solid rgba(var(--v-theme-primary), 0.55) !important;
}

.empty-day {
    opacity: 0.45;
    background-color: rgb(var(--v-theme-surfaceContainerLow));
    border-color: rgba(var(--v-theme-outlineVariant), 0.45);
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