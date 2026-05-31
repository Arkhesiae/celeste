<template>
    <div class="d-flex cursor-pointer overflow-hidden day-block" :style="{ height: height + 'px ' }" :class="{
        'isWorkDay': isWorkDay,
        'selected': selected,
        'today-center-highlight': isToday,
        'empty-day': !isInMonth,
    }" @click="handleClick">
        <!-- Date number + shift name row -->
        <div class="d-flex justify-space-between align-start px-2" :class="{ 'flex-column': xs }"
            style="min-width: 0; overflow: hidden;">
            <!-- Day number -->
            <div class="day_label_container align-center" :class="inPast ? 'text-disabled' : ''">
                <span class="text-body-2"
                    :style="isWorkDay && !inPast ? 'font-weight: 900 !important' : 'font-weight: 400'"
                    :class="{ 'xs': xs }">
                    {{ date.day }}
                </span>
            </div>

            <!-- Shift info -->
            <div class="shift_container align-center" :class="inPast ? 'text-disabled' : ''">
                <div v-if="isWorkDay" class="d-flex align-center test" :class="isOff ? 'offDay' : ''">
                    <span class="shift-name" :class="{ 'xs': xs }">{{ shiftName }}</span>
                    <div v-if="selectedVariation || isOff" class="mod-dot" />
                    <span class="variation-name" :class="{ 'xs': xs }">
                        <template v-if="variationName">{{ variationName }}</template>
                        <template v-else-if="selectedVariation === 'vic'">VIC</template>
                        <template v-else-if="isOff">
                            <v-icon size="10px">mdi-cancel</v-icon>
                        </template>
                    </span>
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

const inPast = computed(() => {
    if (!props.date) return false;
    const today = Temporal.Now.plainDateISO();
    return Temporal.PlainDate.compare(props.date, today) < 0;
});

const handleClick = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    emit('select', props.date);
};
</script>

<style scoped>
.offDay {
    color: rgb(var(--v-theme-error)) !important;
    opacity: 0.5 !important;
}

.day-block {
    width: 100% !important;
    position: relative;
    padding-top: 6px;
    min-width: 0;
    /* prevent flex item from overflowing parent */
    overflow: hidden;
    background-color: rgba(var(--v-theme-surfaceContainerHigh), 1);
    display: grid;
    flex-direction: column;
    border-radius: 12px;
    transition: border-radius var(--motion-expressive-default-effects);
}

.mod-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background-color: rgba(var(--v-theme-onSurface), 0.5);
}

.shift-name {
    font-size: 10px !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
}

.shift-name.xs {
    font-size: 9px !important;
}

.variation-name {
    display: flex;
    align-items: center;
    font-size: 10px !important;
    font-weight: 500 !important;
    opacity: 0.9;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
}

.variation-name.xs {
    font-size: 9px !important;
}

.test {
    gap: 2px;
}

.isWorkDay {
    opacity: 0.9;
    font-weight: 900 !important;
}

.indicator-dot {
    height: 8px;
    width: 8px;
    border-radius: 8px;
}

.selected {
    border-radius: 16px !important;
    color: rgb(var(--v-theme-onPrimary)) !important;
    background: rgba(var(--v-theme-primary), 1) !important;
}

.day_label_container {
    justify-content: center;
    display: flex;
}

.today-center-highlight {
    border: 1px solid rgba(var(--v-theme-surfaceContainerHighest), 0.92) !important;
}

.empty-day {
    opacity: 0.4;
}

.shift_container {
    opacity: 0.9;
    display: flex;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
    min-width: 0;
}

.day_label_container span {
    position: relative;
    font-size: 12px !important;
    font-weight: 500 !important;
}

.day_label_container span.xs {
    font-size: 11px !important;
    font-weight: 500 !important;
}
</style>