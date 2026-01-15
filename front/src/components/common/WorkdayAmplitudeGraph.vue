<template>
    <div class="amplitude-graph-container pa-4 d-flex flex-column" style="height: 100%;">
        <!-- Header -->
        <div class="d-flex justify-end ga-2 align-center mb-4">
            <v-menu location="bottom start">
                <template v-slot:activator="{ props }">
                    <v-chip v-bind="props" variant="tonal" rounded="lg" color="primary" class="font-weight-bold"
                        style="cursor: pointer;">
                        Graph Options
                        <v-icon end icon="mdi-chevron-down" size="small"></v-icon>
                    </v-chip>
                </template>
                <v-list>
                    <v-list-item value="option1" title="Option 1"></v-list-item>
                    <v-list-item value="option2" title="Option 2"></v-list-item>
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
                <div class="graph-wrapper" @mouseleave="clearHover">
                    <!-- Y Axis -->
                    <div class="y-axis">
                        <div v-for="hour in yTickValues" :key="hour" class="y-tick"
                            :style="{ top: getYPosition(hour) + '%' }">
                            <span class="y-label ">{{ formatHour(hour) }}</span>
                        </div>
                    </div>

                    <!-- Chart Content -->
                    <div class="chart-area">
                        <!-- Highlight Window (Absolute behind bars) -->
                        <div class="window-highlight" :style="highlightStyle">
                            <div class="window-label text-overline text-error font-weight-bold">

                            </div>
                        </div>

                        <!-- Dynamic Info Bubble (Moving Div) -->
                        <div>
                           <div v-if="hoverInfo.visible" class="moving-info-bubble"
                                :style="{ left: hoverInfo.leftPos }">
                                <div class="d-flex flex-column align-center">
                                    <span class="text-caption font-weight-bold text-primary">{{ hoverInfo.mainLabel
                                        }}</span>
                                    <span class="text-caption text-medium-emphasis" v-if="hoverInfo.subLabel">{{
                                        hoverInfo.subLabel }}</span>
                                </div>
                                <div class="info-stem"></div>
                            </div>  
                        </div>
                        <div v-if="hoverInfo.visible" class="moving-info-bubble" :style="{ left: hoverInfo.leftPos }">
                            <div class="d-flex flex-column align-center">
                                <span class="text-caption font-weight-bold text-primary">{{ hoverInfo.mainLabel
                                }}</span>
                                <span class="text-caption text-medium-emphasis" v-if="hoverInfo.subLabel">{{
                                    hoverInfo.subLabel }}</span>
                            </div>
                            <div class="info-stem"></div>
                        </div>

                        <!-- Bars Container -->
                        <div class="bars-container">
                            <template v-for="(col, colIndex) in processedData.columns" :key="col.date.toISOString()">
                                <!-- Day Column -->
                                <div class="day-column" @click="onColumnInteract(col, colIndex)"
                                    @mouseenter="onColumnInteract(col, colIndex)">

                                    <!-- REST BLOCKS (Background) -->
                                    <div v-for="(rSeg, rIdx) in col.restSegments"
                                        :key="'rest-' + rSeg.restId + '-' + rIdx" class="rest-bar" :class="{
                                            'is-short-rest': rSeg.isShort,
                                            'is-hovered': hoveredRestId === rSeg.restId
                                        }" :style="getSegmentStyle(rSeg)"
                                        >
                                        <div class="rest-bar__inner" />
                                    </div>

                                    <!-- WORK SEGMENTS (Foreground) -->
                                    <div v-for="(segment, sIdx) in col.workSegments"
                                        :key="'work-' + segment.shiftId + '-' + sIdx" class="work-bar" :class="{
                                            'is-hovered': hoveredShiftId === segment.shiftId,
                                            'is-middle-day': col.isToday
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
                    <template v-for="(col, index) in processedData.columns" :key="'lbl-' + index">
                        <div class="x-label text-caption" :class="{
                            'font-weight-bold text-primary': col.isToday,
                            'text-medium-emphasis': !col.isToday
                        }">
                            {{ col.date.getDate() }}
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
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';

const props = defineProps({
    days: {
        type: Array,
        default: () => []
    }
});

// State
const hoveredShiftId = ref(null);
const hoveredRestId = ref(null);
const windowStartIndex = ref(0);
const step = ref(0);
const hoverInfo = ref({
    visible: false,
    leftPos: '0%',
    mainLabel: '',
    subLabel: ''
});

// Configuration
const LAYOUT_START = 0;
const LAYOUT_END = 24;
const LAYOUT_RANGE = LAYOUT_END - LAYOUT_START;
const yTickValues = [0, 6, 12, 18, 24];

onMounted(() => {
    // Randomize start index (Total 13 days, Window 7 days -> Max index is 6)
    windowStartIndex.value = Math.floor(Math.random() * 7);
});

// -- Hover Logic --

const clearHover = () => {
    hoverInfo.value.visible = false;
    hoveredShiftId.value = null;
    hoveredRestId.value = null;
};

const updateHoverPos = (colIndex) => {
    const total = 13;
    const centerPct = ((colIndex + 0.5) / total) * 100;
    hoverInfo.value.leftPos = `${centerPct}%`;
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

const onColumnInteract = (col, idx) => {
    if (col.shiftNames && col.shiftNames.length > 0) {
        updateHoverPos(idx);
        hoverInfo.value.mainLabel = col.shiftNames.join(', ');
        hoverInfo.value.subLabel = '';
    } else {
        clearHover();
    }
};

const onWorkHover = (segment, col, idx) => {
    hoveredShiftId.value = segment.shiftId;
    updateHoverPos(idx);

    hoverInfo.value.mainLabel = segment.shiftName || 'Shift';
    hoverInfo.value.subLabel = formatTimeRange(segment.startHour, segment.endHour);
};

// const onRestHover = (rSeg, col, idx) => {
//     hoveredRestId.value = rSeg.restId;
//     updateHoverPos(idx);
//     hoverInfo.value.mainLabel = 'Rest';
//     hoverInfo.value.subLabel = formatTimeRange(rSeg.startHour, rSeg.endHour);
// };


const processedData = computed(() => {
    // 1. Sort shifts
    const shifts = [...props.days].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // 2. Define Columns (Date Range: Today +/- 6)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const columns = [];
    for (let i = -6; i <= 6; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
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
        const s = new Date(shift.startDate);
        const e = new Date(shift.endDate);
        const shiftId = shift.id !== undefined ? shift.id : idx; // Ensure unique ID

        // Generate or retrieve Name
        const seed = (typeof shiftId === 'string')
            ? shiftId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
            : shiftId;
        const pseudoRand = (seed * 9301 + 49297) % 233280;
        const type = (pseudoRand % 2 === 0) ? 'J' : 'S';
        const num = (pseudoRand % 20) + 1;
        const shiftName = shift.name || `${type}${num}`;

        // Determine days spanned
        const sIdx = getColIndex(new Date(s.getFullYear(), s.getMonth(), s.getDate()));

        // Add Name to Start Column
        if (sIdx >= 0 && sIdx < columns.length) {
            if (!columns[sIdx].shiftNames) columns[sIdx].shiftNames = [];
            columns[sIdx].shiftNames.push(shiftName);
        }

        // We handle splitting: Part 1 (Start -> Midnight), Part 2 (Midnight -> End)
        // Check if ends on next day
        const sRawH = s.getHours() + s.getMinutes() / 60;
        const eRawH_Abs = e.getHours() + e.getMinutes() / 60;

        // Does it span midnight? 
        // Simple check: if End Date > Start Date (ignoring hours)
        const sDay = new Date(s); sDay.setHours(0, 0, 0, 0);
        const eDay = new Date(e); eDay.setHours(0, 0, 0, 0);

        if (eDay.getTime() > sDay.getTime()) {
            // Split
            // Seg 1: sRawH -> 24
            addToColumn(sIdx, 'workSegments', { startHour: sRawH, endHour: 24 }, { shiftId, shiftName });
            // Seg 2: 0 -> eRawH
            // Assumption: next day is sIdx + 1. If gap is huge (unlikely for overnight shift), loop?
            // "Overnight" implies adjacent days.
            addToColumn(sIdx + 1, 'workSegments', { startHour: 0, endHour: eRawH_Abs }, { shiftId, shiftName });
        } else {
            // Single day
            addToColumn(sIdx, 'workSegments', { startHour: sRawH, endHour: eRawH_Abs }, { shiftId, shiftName });
        }
    });

    // 4. Process Rest Periods (Between Shifts)
    for (let i = 0; i < shifts.length - 1; i++) {
        const current = shifts[i];
        const next = shifts[i + 1];

        // Gap
        const gapStart = new Date(current.endDate);
        const gapEnd = new Date(next.startDate);

        if (gapEnd > gapStart) {
            const diffMs = gapEnd - gapStart;
            const diffHrs = diffMs / (1000 * 60 * 60);

            // Check short rest
            const isShort = diffHrs < 11;
            const restId = i; // Unique ID for this rest period

            // We need to fill segments from gapStart to gapEnd
            // This might span multiple days (e.g. Day Off)

            let cursor = new Date(gapStart);
            while (cursor < gapEnd) {
                const cIdx = getColIndex(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));

                // End of this segment: min(gapEnd, EndOfCurrentDay)
                const endOfDay = new Date(cursor);
                endOfDay.setHours(24, 0, 0, 0); // Midnight next day

                const segmentEnd = (gapEnd < endOfDay) ? gapEnd : endOfDay;

                // Convert to hours [0-24] for this day column
                // Start hour: if cursor is start of day -> 0. Else cursor hours.
                // Re-calculating cursor hours relative to its day
                const dStart = new Date(cursor); dStart.setHours(0, 0, 0, 0);
                // If cursor < dStart (shouldn't happen with logic), clamp?

                const sH = (cursor - dStart) / (1000 * 60 * 60);
                const eH = (segmentEnd - dStart) / (1000 * 60 * 60); // Can be 24

                addToColumn(cIdx, 'restSegments', { startHour: sH, endHour: eH }, { restId, isShort });

                // Advance cursor
                cursor = segmentEnd;
            }
        }
    }

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

    const topPct = ((s - LAYOUT_START) / LAYOUT_RANGE) * 100;
    const height = e - s;
    const heightPct = (height / LAYOUT_RANGE) * 100;

    return {
        top: `${topPct}%`,
        height: `${heightPct}%`
    };
};

const highlightStyle = computed(() => {
    const totalCols = processedData.value.columns.length || 13;
    const colWidthPct = 100 / totalCols;

    return {
        left: `${windowStartIndex.value * colWidthPct}%`,
        width: `${7 * colWidthPct}%`
    };
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
    height: 150px;
    display: flex;
    margin-top: 40px;
    margin-left: 30px;
}

/* Y Axis */
.y-axis {
    position: absolute;
    left: -30px;
    top: 0;
    bottom: 0;
    width: 30px;
}

.y-tick {
    position: absolute;
    font-size: 0.7rem;
    font-weight: 600;
    width: 30px;
    opacity: 0.7;
    transform: translateY(-50%);
    text-align: right;

}

/* Chart Area */
.chart-area {
    flex-grow: 1;
    position: relative;

    
}

/* Highlight Window */
.window-highlight {
    position: absolute;
    bottom: -30px;
    height: 24px;
    /* Extend below X axis */
    background-color: rgba(var(--v-theme-primary), 0.11);
    border: 1px solid rgba(var(--v-theme-primary), 0.03);
    border-radius: 16px;
    z-index: 0;
    pointer-events: none;
    /* Allow clicking through */
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
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
    top: -40px;
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
    background-color: rgba(var(--v-theme-onBackground), 0.4);
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

.day-column {
    flex: 1;
    /* border: 1px solid rgba(var(--v-theme-onBackground), 0.4);  */
    height: 100%;
    position: relative;
    
}

/* WORK BARS */
.work-bar {
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    width: 10px;
    background-color: rgba(var(--v-theme-onBackground), 0.4);
    border-radius: 8px;
    transition: opacity 0.2s;
    cursor: pointer;
    z-index: 10;
}



.work-bar.is-hovered {
    opacity: 0.8;
    background-color: rgb(var(--v-theme-primary));
}

/* REST BARS */
.rest-bar {
    position: absolute;
    left: 10%;
    right: 10%;
    background-color: rgba(var(--v-theme-surface), 1);
    border-radius: 0px;
    z-index: 5;
    transition: background-color 0.2s;
    cursor: pointer;
}

.rest-bar .rest-bar__inner {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 8px;
    border: 1px solid rgba(var(--v-theme-primary), 0.01);
    background-color: rgba(var(--v-theme-primary), .02);
    width: 1px;
    height: 100%;
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

/* X Axis */
.x-axis {
    display: flex;
    margin-left: 30px;
    justify-content: space-between;
    padding: 0 10px;
}

.x-label {
    flex: 1;
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
</style>
