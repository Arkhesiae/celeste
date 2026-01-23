<template>
    <div class="amplitude-graph-container pa-4 d-flex flex-column" style="height: 100%;">
        <!-- Header -->
        <div class="d-flex justify-end ga-2 align-center mb-4">
            <v-menu location="bottom start">
                <template v-slot:activator="{ props }">
                    <v-chip v-bind="props" variant="tonal" rounded="lg" color="primary" class="font-weight-bold"
                        style="cursor: pointer;">
                        Orientation {{ isVertical ? 'verticale' : 'horizontale' }}
                        <v-icon end icon="mdi-chevron-down" size="small"></v-icon>
                    </v-chip>
                </template>
                <v-list>
                    <v-list-item @click="isVertical = true" :active="isVertical" prepend-icon="mdi-format-list-bulleted"
                        title="Vue verticale (Heures en Y)"></v-list-item>
                    <v-list-item @click="isVertical = false" :active="!isVertical"
                        prepend-icon="mdi-format-list-bulleted-type" title="Vue horizontale (Inversée)"></v-list-item>
                </v-list>
            </v-menu>

            <v-btn icon density="comfortable" variant="text" color="medium-emphasis">
                <v-icon icon="mdi-information-outline"></v-icon>
                <v-tooltip activator="parent" location="bottom">
                    Graph Information
                </v-tooltip>
            </v-btn>
        </div>

        <!-- Window -->
        <v-window v-model="step" class="flex-grow-1">
            <v-window-item :value="0">
                <div class="graph-wrapper" :class="{ 'is-horizontal': !isVertical }" @mouseleave="clearHover">
                    <!-- Y Axis -->
                    <div class="y-axis" :class="{ 'is-horizontal': !isVertical }">
                        <template v-if="isVertical">
                            <div v-for="hour in yTickValues" :key="hour" class="y-tick"
                                :style="{ top: getYPosition(hour) + '%' }">
                                <span class="y-label ">{{ formatHour(hour) }}</span>
                            </div>
                        </template>
                        <template v-else>
                            <div v-for="(col, index) in processedData.columns" :key="'y-lbl-' + index" class="y-tick"
                                :style="{ top: (index + 0.5) * (100 / processedData.columns.length) + '%' }">
                                <span class="y-label" :class="{ 'text-primary font-weight-bold': col.isToday }">{{
                                    col.date.getDate() }}</span>
                            </div>
                        </template>
                    </div>

                    <!-- Chart Content -->
                    <div class="chart-area">
                        <!-- Highlight Window (Absolute behind bars) -->
                        <div class="window-highlight" :style="highlightStyle">
                            <div class="window-label text-overline text-error font-weight-bold">

                            </div>
                        </div>

                        <!-- Dynamic Info Bubble (Moving Div) -->
                        <div class="bubble-container">
                            <div class="bubble-content">
                                <Transition name="fade">
                                    <div v-if="hoverInfo.visible" class="moving-info-bubble"
                                        :style="{ left: hoverInfo.leftPos }">
                                        <div class="d-flex flex-column align-center">
                                            <span class="text-caption font-weight-bold text-primary">{{
                                                hoverInfo.mainLabel
                                                }}</span>
                                            <span class="text-caption text-medium-emphasis mt-n1"
                                                v-if="hoverInfo.subLabel">{{
                                                    hoverInfo.subLabel }}</span>
                                        </div>
                                        <div class="info-stem"
                                            :style="{ height: (10 + (hoverInfo.topPos / 100 * 150)) + 'px' }"></div>
                                    </div>
                                </Transition>
                            </div>

                        </div>
                        <!-- <div v-if="hoverInfo.visible" class="moving-info-bubble" :style="{ left: hoverInfo.leftPos }">
                            <div class="d-flex flex-column align-center">
                                <span class="text-caption font-weight-bold text-primary">{{ hoverInfo.mainLabel
                                    }}</span>
                                <span class="text-caption text-medium-emphasis" v-if="hoverInfo.subLabel">{{
                                    hoverInfo.subLabel }}</span>
                            </div>
                            <div class="info-stem"></div>
                        </div> -->

                        <!-- Bars Container -->
                        <div class="bars-container" :class="{ 'is-horizontal': !isVertical }">
                            <template v-for="(col, colIndex) in processedData.columns" :key="col.date.toISOString()">
                                <!-- Day Column -->
                                <div class="day-column" @click="onColumnInteract(col, colIndex)"
                                    @mouseenter="onColumnInteract(col, colIndex)">

                                    <!-- REST BLOCKS (Background) -->
                                    <div :key="'rest-' + colIndex" class="rest-bar"
                                        :style="getRestSegmentStyle(colIndex)">
                                        <div class="rest-bar__inner" />
                                    </div>

                                    <!-- HOVERED REST BLOCKS -->
                                    <TransitionGroup name="rest-pop">
                                        <div v-for="(seg, sIdx) in activeRestSegments.filter(s => s.colIndex === colIndex)"
                                            :key="'active-rest-' + colIndex + '-' + sIdx"
                                            class="rest-bar is-active-hover" :style="getSegmentStyle(seg)">
                                            <div class="rest-bar__inner" />
                                        </div>
                                    </TransitionGroup>

                                    <!-- INCOMPATIBILITY BLOCKS (Background) -->
                                    <div v-for="(win, wIdx) in col.incompatibilitySegments"
                                        :key="'incompatibility-' + win.shiftId + '-' + wIdx" class="incompatibility-bar"
                                        :class="{
                                            'is-hovered': hoveredShiftId === win.shiftId
                                        }" :style="getSegmentStyle(win)">
                                        <div class="incompatibility-bar__inner" />
                                    </div>

                                    <!-- WORK BLOCKS (Foreground) -->
                                    <div v-for="(segment, sIdx) in col.workSegments"
                                        :key="'work-' + segment.shiftId + '-' + sIdx" class="work-bar" :class="{
                                            'is-hovered': hoveredShiftId === segment.shiftId,
                                            'is-middle-day': col.isToday,
                                            'is-demand-shift': segment.isDemandShift
                                        }" :style="getSegmentStyle(segment)"
                                        @mouseenter.stop="onWorkHover(segment, col, colIndex)"
                                        @click.stop="onWorkHover(segment, col, colIndex)"
                                        @mouseleave="hoveredShiftId = null" />
                                </div>
                            </template>
                        </div>
                    </div>
                </div>

                <!-- X Axis -->
                <div class="x-axis mt-2">
                    <template v-if="isVertical">
                        <template v-for="(col, index) in processedData.columns" :key="'lbl-' + index">
                            <div class="x-label" :class="{
                                'font-weight-bold text-primary': col.isToday,
                                'text-medium-emphasis': !col.isToday
                            }">
                                {{ col.date.getDate() }}
                            </div>
                        </template>
                    </template>
                    <template v-else>
                        <div v-for="hour in yTickValues" :key="'x-hour-' + hour" class="x-label"
                            style="flex: none; position: absolute;" :style="{ left: (hour / 24 * 100) + '%' }">
                            {{ formatHour(hour) }}
                        </div>
                    </template>
                </div>

                <!-- Window Controls -->
                <div class="controls-section mt-4 pt-2 border-t">
                    <div class="d-flex align-center justify-end">

                        <div class="d-flex align-center" style="gap: 8px;">
                            <v-btn icon="mdi-chevron-left" variant="text" density="compact"
                                :disabled="windowStartIndex <= 0" @click="windowStartIndex--" />

                            <span class="text-caption font-weight-bold">
                                {{ getWindowDateLabel(windowStartIndex) }} - {{ getWindowDateLabel(windowStartIndex + 6)
                                }}
                            </span>

                            <v-btn icon="mdi-chevron-right" variant="text" density="compact"
                                :disabled="windowStartIndex >= processedData.columns.length - 7"
                                @click="windowStartIndex++" />
                        </div>
                    </div>

                </div>
            </v-window-item>

            <!-- Placeholder Windows -->
            <v-window-item :value="1">
                <div class="d-flex align-center justify-center fill-height" style="height: 300px;">
                    <div class="text-h6 text-medium-emphasis">Window 2 Placeholder</div>
                </div>
            </v-window-item>

            <v-window-item :value="2">
                <div class="d-flex align-center justify-center fill-height" style="height: 300px;">
                    <div class="text-h6 text-medium-emphasis">Window 3 Placeholder</div>
                </div>
            </v-window-item>
        </v-window>

        <!-- Footer Indicators -->
        <div class="d-flex justify-center mt-4" style="gap: 8px;">
            <div v-for="i in 3" :key="i" class="window-dot" :class="{ 'is-active': step === i - 1 }"
                @click="step = i - 1"></div>
        </div>


    </div>
    <!-- Incompatibilities Chips -->
    <div class="pb-4 pl-2"
        v-if="props.compatibility?.limit?.length > 0 || (props.compatibility?.invalidWindows?.length > 0)">
        <div class="text-caption mb-2 text-disabled px-2">Anomalies détectées</div>
        <div class="d-flex flex-wrap ga-2 px-2">
            <v-chip v-for="limit in props.compatibility.limit" :key="limit" color="error" rounded variant="tonal"
                size="small" class="font-weight-bold">
                <v-icon start icon="mdi-alert-circle-outline"></v-icon>
                {{ limitLabels[limit] || limit }}
            </v-chip>

            <v-chip @mouseenter.stop="onIncompatibilityHover(win)" @mouseleave="clearRestSegments"
                v-for="(win, idx) in props.compatibility.invalidRest35" :key="'win-' + idx" rounded color="error"
                variant="tonal" size="small" class="font-weight-bold cursor-pointer">
                <v-icon start icon="mdi-calendar-clock"></v-icon>
                Repos hebdo : {{ Math.round(win.longestRest / 60) }}h / 35h
                <v-tooltip activator="parent" location="bottom">
                    {{ new Date(win.windowStart).toLocaleDateString() }} - {{ new
                        Date(win.windowEnd).toLocaleDateString()
                    }}
                </v-tooltip>
            </v-chip>
            <v-chip @mouseenter.stop="onIncompatibilityHover(win)" @mouseleave="clearRestSegments"
                v-for="(win, idx) in props.compatibility.invalidWork48" :key="'win-' + idx" rounded color="error"
                variant="tonal" size="small" class="font-weight-bold cursor-pointer">
                <v-icon start icon="mdi-alarm"></v-icon>
                Travail hebdo : {{ Math.round(win.totalWorkMinutes / 60) }}h / 48h
                <v-tooltip activator="parent" location="bottom">
                    {{ new Date(win.windowStart).toLocaleDateString() }} - {{ new
                        Date(win.windowEnd).toLocaleDateString()
                    }}
                </v-tooltip>
            </v-chip>
        </div>
    </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';

const props = defineProps({
    days: {
        type: Array,
        default: () => []
    },
    centerDate: {
        type: [String, Date],
        default: null
    },
    compatibility: {
        type: Object,
        default: () => ({ limit: [] })
    }
});

// State
const hoveredShiftId = ref(null);
const hoveredRestId = ref(null);
const activeRestSegments = ref([]);
const windowStartIndex = ref(0);
const step = ref(0);
const isVertical = ref(true);
const hoverInfo = ref({
    visible: false,
    leftPos: '0%',
    mainLabel: '',
    subLabel: '',
    topPos: 0
});

// Configuration
const LAYOUT_START = 0;
const LAYOUT_END = 24;
const LAYOUT_RANGE = LAYOUT_END - LAYOUT_START;
const yTickValues = [0, 6, 12, 18, 24];

const limitLabels = {
    alreadyWorking: 'Déjà en poste',
    insufficientRest: 'Repos < 11h',
    '35limit': 'Repos hebdo < 35h',
    '48hLimit': 'Semaine > 48h',
    consecutiveDaysLimit: '> 5 jours consécutifs',
    nightControlRestLimit: 'Repos nuit < 12h',
    consecutiveNightLimit: '> 2 nuits consécutives'
};

onMounted(() => {
    // If centerDate is provided, center the 7-day viewing window (index 3 covers indices 3-9, with 6 in the middle)
    if (props.centerDate) {
        windowStartIndex.value = 3;
    } else {
        windowStartIndex.value = Math.floor(Math.random() * 7);
    }
});

// -- Hover Logic --

const clearHover = () => {
    hoverInfo.value.visible = false;
    hoveredShiftId.value = null;
    hoveredRestId.value = null;
    hoverInfo.value.topPos = 0;
    clearRestSegments();
};

const clearRestSegments = () => {
    activeRestSegments.value = [];
};

const updateHoverPos = (colIndex, hourCenterPct = null) => {
    const total = processedData.value.columns.length || 13;
    if (isVertical.value) {
        const centerPct = ((colIndex + 0.5) / total) * 100;
        hoverInfo.value.leftPos = `${centerPct}%`;
    } else {
        hoverInfo.value.leftPos = `${hourCenterPct || 0}%`;
    }
    hoverInfo.value.visible = true;
};

const formatTimeRange = (startH, endH) => {
    const format = (h) => {
        const hh = Math.floor(h);
        const mm = Math.round((h % 1) * 60);
        return `${hh}:${mm.toString().padStart(2, '0')}`;
    };
    return `${format(startH)} - ${format(endH)}`;
};

const formatFullTimeRange = (start, end) => {
    console.log(start, end)
    const s = start?.slice(11, 16)

    const e = end?.slice(11, 16)
    return `${s} - ${e}`;
};

const onColumnInteract = (col, idx) => {
    if (col.shiftNames && col.shiftNames.length > 0) {
        updateHoverPos(idx, 50); // Default to middle for column-level hover in horizontal
        hoverInfo.value.mainLabel = col.shiftNames.join(', ');
        hoverInfo.value.subLabel = '';
        if (!isVertical.value) {
            const total = processedData.value.columns.length || 13;
            hoverInfo.value.topPos = ((idx + 0.5) / total) * 100;
        }
    } else {
        clearHover();
    }
};

const onWorkHover = (segment, col, idx) => {
    hoveredShiftId.value = segment.shiftId;

    const s = Math.max(LAYOUT_START, segment.startHour);
    const e = Math.min(LAYOUT_END, segment.endHour);
    const centerHour = (s + e) / 2;
    const hourPct = (centerHour / 24) * 100;

    updateHoverPos(idx, hourPct);

    hoverInfo.value.mainLabel = segment.shiftName || 'Shift';

    if (segment.start && segment.end) {
        hoverInfo.value.subLabel = formatFullTimeRange(segment.start, segment.end);
    }

    if (isVertical.value) {
        hoverInfo.value.topPos = ((s - LAYOUT_START) / LAYOUT_RANGE) * 100;
    } else {
        const total = processedData.value.columns.length || 13;
        hoverInfo.value.topPos = ((idx + 0.5) / total) * 100;
    }
};

const onIncompatibilityHover = (win) => {
    clearRestSegments();

    const colIndexStart = getColIndex(new Date(win.longestRestStart));
    const colIndexEnd = getColIndex(new Date(win.longestRestEnd));

    const s = new Date(win.longestRestStart);
    const e = new Date(win.longestRestEnd);


    const sRawH = s.getUTCHours() + s.getUTCMinutes() / 60;
    const eRawH_Abs = e.getUTCHours() + e.getUTCMinutes() / 60;

    const sDay = new Date(s); sDay.setUTCHours(0, 0, 0, 0);
    const eDay = new Date(e); eDay.setUTCHours(0, 0, 0, 0);

    if (eDay.getTime() > sDay.getTime()) {
        displayRestSegment(colIndexStart, { startHour: sRawH, endHour: 24 });
        displayRestSegment(colIndexEnd, { startHour: 0, endHour: eRawH_Abs });
    } else {
        displayRestSegment(colIndexStart, { startHour: sRawH, endHour: eRawH_Abs });
    }
};

const displayRestSegment = (colIndex, segment) => {
    activeRestSegments.value.push({ colIndex, ...segment });
};


const getRestSegmentStyle = (colIndex) => {
    const col = processedData.value.columns[colIndex];
    if (!col || !col.restSegments || col.restSegments.length === 0) return { display: 'none' };
    const s = col.restSegments[0].startHour;
    const e = col.restSegments[0].endHour;
    return getSegmentStyle({ startHour: s, endHour: e });
};


// Helper: Find column index by date
const getColIndex = (dateObj) => {
    const t = dateObj.getTime();
    // Since columns are consecutive, index = diff in days from start
    // Start date is columns[0].date
    const start = processedData.value.columns[0].date.getTime();
    const diffMs = t - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
};

const addToColumn = (colIndex, type, header, additionalProps = {}) => {
    if (colIndex >= 0 && colIndex < columns.length) {
        columns[colIndex][type].push({
            startHour: header.startHour,
            endHour: header.endHour,
            ...additionalProps
        });
    }
};

const processedData = computed(() => {
    // 1. Sort shifts (filter out empty placeholders created by parent)
    const shifts = [...props.days]
        .filter(d => d.start && d.end)
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    // 2. Define Columns (Date Range: Center +/- 6)
    const center = props.centerDate ? new Date(props.centerDate) : new Date();
    center.setHours(0, 0, 0, 0);

    const columns = [];
    for (let i = -6; i <= 6; i++) {
        const d = new Date(center);
        d.setDate(center.getDate() + i);
        columns.push({
            date: d,
            isToday: i === 0,
            workSegments: [],
            restSegments: []
        });
    }


    // Helper: Find column index by date
    const getColIndex = (dateObj) => {
        const t = dateObj.getTime();
        // Since columns are consecutive, index = diff in days from start
        // Start date is columns[0].date
        const start = columns[0].date.getTime();
        const diffMs = t - start;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const addToColumn = (colIndex, type, header, additionalProps = {}) => {
        if (colIndex >= 0 && colIndex < columns.length) {
            columns[colIndex][type].push({
                startHour: header.startHour,
                endHour: header.endHour,
                ...additionalProps
            });
        }
    };


    // 3. Process Work Shifts
    shifts.forEach((shift, idx) => {
        // console.log(shift)
        const s = new Date(shift.start);
        const e = new Date(shift.end);
        // console.log(s)
        // console.log(e)
        const shiftId = shift.id !== undefined ? shift.id : idx; // Ensure unique ID
        const shiftName = shift.name || 'Shift';

        console.log(s, e)
        // Determine days spanned
        const sIdx = getColIndex(new Date(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));

        // Add Name to Start Column
        if (sIdx >= 0 && sIdx < columns.length) {
            if (!columns[sIdx].shiftNames) columns[sIdx].shiftNames = [];
            columns[sIdx].shiftNames.push(shiftName);
        }

        // We handle splitting: Part 1 (Start -> Midnight), Part 2 (Midnight -> End)
        // Check if ends on next day
        const sRawH = s.getUTCHours() + s.getUTCMinutes() / 60;
        const eRawH_Abs = e.getUTCHours() + e.getUTCMinutes() / 60;

        // Does it span midnight? 
        // Simple check: if End Date > Start Date (ignoring hours)
        const sDay = new Date(s); sDay.setUTCHours(0, 0, 0, 0);
        const eDay = new Date(e); eDay.setUTCHours(0, 0, 0, 0);

        if (eDay.getTime() > sDay.getTime()) {
            // Split
            // Seg 1: sRawH -> 24
            addToColumn(sIdx, 'workSegments', { startHour: sRawH, endHour: 24 }, { ...shift, shiftId, shiftName });
            // Seg 2: 0 -> eRawH
            addToColumn(sIdx + 1, 'workSegments', { startHour: 0, endHour: eRawH_Abs }, { ...shift, shiftId, shiftName });
        } else {
            // Single day
            addToColumn(sIdx, 'workSegments', { startHour: sRawH, endHour: eRawH_Abs }, { ...shift, shiftId, shiftName });
        }
    });

    // // 4. Process Rest Periods (Between Shifts)
    // for (let i = 0; i < shifts.length - 1; i++) {
    //     const current = shifts[i];
    //     const next = shifts[i + 1];

    //     // Gap
    //     const gapStart = new Date(current.end);
    //     const gapEnd = new Date(next.start);

    //     if (gapEnd > gapStart) {
    //         const diffMs = gapEnd - gapStart;
    //         const diffHrs = diffMs / (1000 * 60 * 60);

    //         // Check short rest
    //         const isShort = diffHrs < 11;
    //         const restId = i; // Unique ID for this rest period

    //         // We need to fill segments from gapStart to gapEnd
    //         // This might span multiple days (e.g. Day Off)

    //         let cursor = new Date(gapStart);
    //         while (cursor < gapEnd) {
    //             const cIdx = getColIndex(new Date(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate()));

    //             // End of this segment: min(gapEnd, EndOfCurrentDay)
    //             const endOfDay = new Date(cursor);
    //             endOfDay.setUTCHours(24, 0, 0, 0); // Midnight next day

    //             const segmentEnd = (gapEnd < endOfDay) ? gapEnd : endOfDay;

    //             // Convert to hours [0-24] for this day column
    //             // Start hour: if cursor is start of day -> 0. Else cursor hours.
    //             // Re-calculating cursor hours relative to its day
    //             const dStart = new Date(cursor); dStart.setUTCHours(0, 0, 0, 0);
    //             // If cursor < dStart (shouldn't happen with logic), clamp?

    //             const sH = (cursor - dStart) / (1000 * 60 * 60);
    //             const eH = (segmentEnd - dStart) / (1000 * 60 * 60); // Can be 24

    //             addToColumn(cIdx, 'restSegments', { startHour: sH, endHour: eH }, { restId, isShort });

    //             // Advance cursor
    //             cursor = segmentEnd;
    //         }
    // }
    // }

    return { columns };
});


// -- Stats / Helpers --

const getYPosition = (hour) => {
    return ((hour - LAYOUT_START) / LAYOUT_RANGE) * 100;
};

const formatHour = (h) => `${h} h`;

const getSegmentStyle = (seg) => {
    // seg has startHour, endHour
    // Clamp
    const s = Math.max(LAYOUT_START, seg.startHour);
    const e = Math.min(LAYOUT_END, seg.endHour);

    if (s >= e) return { display: 'none' };

    const startPct = ((s - LAYOUT_START) / LAYOUT_RANGE) * 100;
    const size = e - s;
    const sizePct = (size / LAYOUT_RANGE) * 100;

    if (isVertical.value) {
        return {
            top: `${startPct}%`,
            height: `${sizePct}%`
        };
    } else {
        return {
            left: `${startPct}%`,
            width: `${sizePct}%`
        };
    }
};

const highlightStyle = computed(() => {
    const totalCols = processedData.value.columns.length || 13;
    const colSizePct = 100 / totalCols;

    if (isVertical.value) {
        return {
            left: `${windowStartIndex.value * colSizePct}%`,
            width: `${7 * colSizePct}%`
        };
    } else {
        return {
            top: `${windowStartIndex.value * colSizePct}%`,
            height: `${7 * colSizePct}%`
        };
    }
});

const getWindowDateLabel = (idx) => {
    if (!processedData.value.columns[idx]) return '';
    const d = processedData.value.columns[idx].date;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

</script>

<style scoped>
.graph-wrapper {
    position: relative;
    /* border: 1px solid #e0e0e0; */
    height: 150px;
    display: flex;
    margin-top: 50px;
    margin-left: 20px;
}

/* Y Axis */
.y-axis {
    position: absolute;
    left: -20px;
    top: 0;
    bottom: 0;
    width: 20px;
}

.y-tick {
    position: absolute;
    font-size: 0.57rem;
    font-weight: 600;
    width: 20px;
    opacity: 0.7;
    transform: translateY(-50%);
    text-align: right;
}

.y-axis.is-horizontal {
    width: 30px;
    left: -30px;
}

.y-axis.is-horizontal .y-tick {
    width: 30px;
    text-align: center;
}

/* Chart Area */
.chart-area {
    flex-grow: 1;
    position: relative;


}

.bubble-container {
    padding-left: 10px;
    padding-right: 10px;

    position: relative;
    /* border: 1px solid #ff1616; */
}

.bubble-content {
    position: relative;

    /* border: 1px solid #4ebd68; */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10;
}

/* Highlight Window */
.window-highlight {
    position: absolute;
    background-color: rgba(var(--v-theme-primary), 0.11);
    border: 1px solid rgba(var(--v-theme-primary), 0.03);
    border-radius: 16px;
    z-index: 0;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.graph-wrapper:not(.is-horizontal) .window-highlight {
    bottom: -30px;
    height: 2px;
}

.graph-wrapper.is-horizontal .window-highlight {
    left: -40px;
    width: 2px;
}

/* .window-label {
    position: absolute;
    bottom: -24px;
    left: 8px;
    white-space: nowrap;
} */

/* Moving Info Bubble */
.moving-info-bubble {
    position: absolute;
    /* border: 1px solid rgba(var(--v-theme-onBackground), 0.4); */
    top: -50px;
    transform: translateX(-50%);
    z-index: 100;
    pointer-events: none;
    /* Don't block interactions */
    transition: left 0.2s cubic-bezier(0.25, 0.8, 0.5, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
}



/* Removed elevation/shadow as requested */

.info-stem {
    width: 1px;
    height: 10px;
    background-color: rgba(var(--v-theme-onBackground), 0.1);
    transition: height 0.2s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.bars-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: flex-start;
    padding: 0 10px;
    z-index: 1;
}

.bars-container.is-horizontal {
    flex-direction: column;
    padding: 5px 0;
}

.day-column {
    flex: 1;
    height: 100%;
    position: relative;
}

.bars-container.is-horizontal .day-column {
    width: 100%;
    height: auto;
}

/* WORK BARS */
.work-bar {
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    width: 10px;
    background-color: rgba(var(--v-theme-primary), 0.2);
    border: 1px solid rgba(var(--v-theme-onBackground), 0.01);
    border-radius: 8px;
    transition: opacity 0.2s;
    cursor: pointer;
    z-index: 10;
}

.is-horizontal .work-bar {
    transform: translateY(-50%);
    top: 50%;
    left: auto;
    height: 10px;
    border-radius: 4px;
}

.work-bar.is-hovered {
    opacity: 0.8;
    background-color: rgb(var(--v-theme-primary));
}

.work-bar.is-demand-shift {
    background-color: rgba(var(--v-theme-primary), 0);
    border: 1px dashed rgba(var(--v-theme-error), 1);
    /* Vibrant Orange for visibility */
    width: 10px;
    /* Slightly narrower if they overlap, or use a different position if needed */
    z-index: 15;
}

.is-horizontal .work-bar.is-demand-shift {
    width: auto;
    height: 10px;
}

.work-bar.is-demand-shift.is-hovered {
    background-color: rgba(var(--v-theme-error), .5);
}

/* REST BARS */
.rest-bar {
    position: absolute;
    left: 10%;
    right: 10%;
    background-color: rgba(var(--v-theme-surface), 0);
    border-radius: 0px;
    z-index: 5;
    transition: background-color 0.2s;
    cursor: pointer;
}

.is-horizontal .rest-bar {
    top: 10%;
    bottom: 10%;
    left: auto;
    right: auto;
}

.rest-bar .rest-bar__inner {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 8px;
    border: 1px solid rgba(var(--v-theme-primary), 0.001);
    background-color: rgba(var(--v-theme-primary), .02);
    width: 1px;
    height: 100%;
}

.is-horizontal .rest-bar .rest-bar__inner {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 100%;
    height: 1px;
}

.rest-bar.is-hovered .rest-bar__inner {
    background-color: rgba(var(--v-theme-primary), 0.8);
}

.rest-bar.is-short-rest .rest-bar__inner {
    background-color: rgba(var(--v-theme-error), 0.2);
}

.rest-bar.is-short-rest.is-hovered .rest-bar__inner {
    background-color: rgba(var(--v-theme-error), 0.8);
}

.rest-bar.is-active-hover {
    z-index: 20;
}

.rest-bar.is-active-hover .rest-bar__inner {
    background-color: rgba(var(--v-theme-error), 1);
    width: 1px;
    box-shadow: 0 0 20px rgba(255, 0, 81, 0.1);
}

.is-horizontal .rest-bar.is-active-hover .rest-bar__inner {
    width: 100%;
    height: 1px;
}


.rest-pop-enter-active {
    transition: all 0.3s ease-in-out;
}

.rest-pop-leave-active {
    transition: all 0.2s ease-in;
}

.rest-pop-enter-from {
    opacity: .5;
    transform: scaleY(0);
}

.rest-pop-leave-to {
    opacity: 0;
}

/* X Axis */
.x-axis {
    display: flex;
    margin-left: 20px;
    justify-content: space-between;
    padding: 0 10px;
    position: relative;
    height: 1.5rem;
}

.x-label {
    flex: 1;
    font-size: 0.6rem;
    text-align: center;
}

/* Controls */
.controls-section {
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}

.window-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgba(var(--v-theme-on-surface), 0.2);
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
    cursor: pointer;
}

.window-dot.is-active {
    width: 24px;
    border-radius: 4px;
    background-color: rgb(var(--v-theme-primary));
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
