<template>
  <div
    class="amplitude-graph-container pa-4 d-flex flex-column"
    style="height: 100%;"
  >
    <!-- Header -->
    <div class="d-flex justify-end ga-2 align-center mb-4">
      <v-menu location="bottom start">
        <template #activator="{ props }">
          <v-chip
            v-bind="props"
            variant="tonal"
            rounded="lg"
            color="primary"
            class="font-weight-bold"
            style="cursor: pointer;"
          >
            Orientation {{ isVertical ? 'verticale' : 'horizontale' }}
            <v-icon
              end
              icon="mdi-chevron-down"
              size="small"
            />
          </v-chip>
        </template>
        <v-list>
          <v-list-item
            :active="isVertical"
            prepend-icon="mdi-format-list-bulleted"
            title="Vue verticale (Heures en Y)"
            @click="isVertical = true"
          />
          <v-list-item
            :active="!isVertical"
            prepend-icon="mdi-format-list-bulleted-type"
            title="Vue horizontale (Inversée)"
            @click="isVertical = false"
          />
        </v-list>
      </v-menu>

      <v-btn
        icon
        density="comfortable"
        variant="text"
        color="medium-emphasis"
      >
        <v-icon icon="mdi-information-outline" />
        <v-tooltip
          activator="parent"
          location="bottom"
        >
          Compatibilité avec les vacs adjacentes
        </v-tooltip>
      </v-btn>
    </div>

    <!-- Window -->
    <v-window
      v-model="step"
      class="flex-grow-1"
    >
      <v-window-item :value="0">
        <div
          class="graph-wrapper"
          :class="{ 'is-horizontal': !isVertical }"
          @mouseleave="clearHover"
        >
          <!-- Y Axis -->
          <div
            class="y-axis"
            :class="{ 'is-horizontal': !isVertical }"
          >
            <template v-if="isVertical">
              <div
                v-for="hour in yTickValues"
                :key="hour"
                class="y-tick"
                :style="{ top: getYPosition(hour) + '%' }"
              >
                <span class="y-label ">{{ formatHour(hour) }}</span>
              </div>
            </template>
            <template v-else>
              <div
                v-for="(col, index) in processedData.columns"
                :key="'y-lbl-' + index"
                class="y-tick"
                :style="{ top: (index + 0.5) * (100 / processedData.columns.length) + '%' }"
              >
                <span
                  class="y-label"
                  :class="{ 'text-primary font-weight-bold': col.isToday }"
                >{{
                  col.date.getDate() }}</span>
              </div>
            </template>
          </div>

          <!-- Chart Content -->
          <div class="chart-area">
            <!-- Highlight Window (Absolute behind bars) -->
            <div
              class="window-highlight"
              :style="highlightStyle"
            >
              <div class="window-label text-label-medium text-error font-weight-bold" />
            </div>

            <!-- Dynamic Info Bubble (Moving Div) -->
            <div class="bubble-container">
              <div class="bubble-content">
                <Transition name="fade">
                  <div
                    v-if="hoverInfo.visible"
                    class="moving-info-bubble"
                    :style="{ left: hoverInfo.leftPos }"
                  >
                    <div class="d-flex flex-column align-center">
                      <span class="text-body-small font-weight-bold text-primary">{{
                        hoverInfo.mainLabel
                      }}</span>
                      <span
                        v-if="hoverInfo.subLabel"
                        class="text-body-small text-medium-emphasis mt-n1"
                      >{{
                        hoverInfo.subLabel }}</span>
                    </div>
                    <div
                      class="info-stem"
                      :style="{ height: (10 + (hoverInfo.topPos / 100 * 150)) + 'px' }"
                    />
                  </div>
                </Transition>
              </div>
            </div>
            <!-- <div v-if="hoverInfo.visible" class="moving-info-bubble" :style="{ left: hoverInfo.leftPos }">
                            <div class="d-flex flex-column align-center">
                                <span class="text-body-small font-weight-bold text-primary">{{ hoverInfo.mainLabel
                                    }}</span>
                                <span class="text-body-small text-medium-emphasis" v-if="hoverInfo.subLabel">{{
                                    hoverInfo.subLabel }}</span>
                            </div>
                            <div class="info-stem"></div>
                        </div> -->

            <!-- Bars Container -->
            <div
              class="bars-container"
              :class="{ 'is-horizontal': !isVertical }"
            >
              <template
                v-for="(col, colIndex) in processedData.columns"
                :key="col.date.toISOString()"
              >
                <!-- Day Column -->
                <div
                  class="day-column"
                  @click="onColumnInteract(col, colIndex)"
                  @mouseenter="onColumnInteract(col, colIndex)"
                >
                  <!-- REST BLOCKS (Background) -->
                  <div
                    :key="'rest-' + colIndex"
                    class="rest-bar"
                    :style="getRestSegmentStyle(colIndex)"
                  >
                    <div class="rest-bar__inner" />
                  </div>

                  <!-- HOVERED REST BLOCKS -->
                  <TransitionGroup name="rest-pop">
                    <div
                      v-for="(seg, sIdx) in activeRestSegments.filter(s => s.colIndex === colIndex)"
                      :key="'active-rest-' + colIndex + '-' + sIdx"
                      class="rest-bar is-active-hover"
                      :style="getSegmentStyle(seg)"
                    >
                      <div class="rest-bar__inner" />
                    </div>
                  </TransitionGroup>

                  <!-- INCOMPATIBILITY BLOCKS (Background) -->
                  <div
                    v-for="(win, wIdx) in col.incompatibilitySegments"
                    :key="'incompatibility-' + win.shiftId + '-' + wIdx"
                    class="incompatibility-bar"
                    :class="{
                      'is-hovered': hoveredShiftId === win.shiftId
                    }"
                    :style="getSegmentStyle(win)"
                  >
                    <div class="incompatibility-bar__inner" />
                  </div>

                  <!-- WORK BLOCKS (Foreground) -->
                  <div
                    v-for="(segment, sIdx) in col.workSegments"
                    :key="'work-' + segment.shiftId + '-' + sIdx"
                    class="work-bar"
                    :class="{
                      'is-hovered': hoveredShiftId === segment.shiftId,
                      'is-middle-day': col.isToday,
                      'is-demand-shift': segment.isDemandShift
                    }"
                    :style="getSegmentStyle(segment)"
                    @mouseenter.stop="onWorkHover(segment, col, colIndex)"
                    @click.stop="onWorkHover(segment, col, colIndex)"
                    @mouseleave="hoveredShiftId = null"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- X Axis -->
        <div class="x-axis mt-2">
          <template v-if="isVertical">
            <template
              v-for="(col, index) in processedData.columns"
              :key="'lbl-' + index"
            >
              <div
                class="x-label"
                :class="{
                  'font-weight-bold text-primary': col.isToday,
                  'text-medium-emphasis': !col.isToday
                }"
              >
                {{ col.date.getDate() }}
              </div>
            </template>
          </template>
          <template v-else>
            <div
              v-for="hour in yTickValues"
              :key="'x-hour-' + hour"
              class="x-label"
              style="flex: none; position: absolute;"
              :style="{ left: (hour / 24 * 100) + '%' }"
            >
              {{ formatHour(hour) }}
            </div>
          </template>
        </div>

        <!-- Window Controls -->
        <div class="controls-section mt-4 pt-2">
          <div class="d-flex align-center justify-end">
            <div
              class="d-flex align-center"
              style="gap: 8px;"
            >
              <v-btn
                icon="mdi-chevron-left"
                variant="text"
                density="compact"
                :disabled="windowStartIndex <= 0"
                @click="windowStartIndex--"
              />

              <span class="text-body-small font-weight-bold">
                {{ getWindowDateLabel(windowStartIndex) }} - {{ getWindowDateLabel(windowStartIndex + 6)
                }}
              </span>

              <v-btn
                icon="mdi-chevron-right"
                variant="text"
                density="compact"
                :disabled="windowStartIndex >= processedData.columns.length - 7"
                @click="windowStartIndex++"
              />
            </div>
          </div>
        </div>
      </v-window-item>

      <!-- Placeholder Windows
            <v-window-item :value="1">
                <div class="d-flex align-center justify-center fill-height" style="height: 300px;">
                    <div class="text-title-large text-medium-emphasis">Window 2 Placeholder</div>
                </div>
            </v-window-item>

            <v-window-item :value="2">
                <div class="d-flex align-center justify-center fill-height" style="height: 300px;">
                    <div class="text-title-large text-medium-emphasis">Window 3 Placeholder</div>
                </div>
            </v-window-item> -->
    </v-window>

    <!-- Footer Indicators -->
    <!-- <div class="d-flex justify-center mt-4" style="gap: 8px;">
            <div v-for="i in 3" :key="i" class="window-dot" :class="{ 'is-active': step === i - 1 }"
                @click="step = i - 1"></div>
        </div> -->
  </div>
  <!-- Incompatibilities Chips -->
  <div
    v-if="filteredLimits.length > 0 || deduplicatedInvalidRest35.length > 0 || deduplicatedInvalidWork48.length > 0"
    class="pb-4 pl-2"
  >
    <div class="text-body-small mb-2 text-disabled px-2">
      Anomalies détectées
    </div>
    <div class="d-flex flex-wrap ga-2 px-2">
      <v-chip
        v-for="limit in filteredLimits"
        :key="limit"
        :color="isAnomalyFixableByVariation(limit) ? 'anomalySoft' : 'error'"
        rounded
        variant="tonal"
        size="small"
        class="font-weight-bold cursor-pointer"
      >
        <v-icon
          start
          icon="mdi-alert-circle-outline"
        />
        {{ limitLabels[limit] || limit }}
        <v-tooltip
          activator="parent"
          location="bottom"
          open-on-click
        >
          {{ getLimitTooltip(limit) }}
        </v-tooltip>
      </v-chip>

      <v-chip
        v-for="(win, idx) in deduplicatedInvalidRest35"
        :key="'rest35-' + new Date(win.longestRestStart).getTime() + '-' + new Date(win.longestRestEnd).getTime()"
        rounded
        :color="isRestWorkFixable ? 'anomalySoft' : 'error'"
        variant="tonal"
        size="small"
        class="font-weight-bold cursor-pointer"
        @mouseenter.stop="onIncompatibilityHover(win)"
        @mouseleave="clearRestSegments"
      >
        <v-icon
          start
          icon="mdi-calendar-clock"
        />
        Repos hebdo : {{ formatRestMinutes(win.longestRest) }} / 35h
        <v-tooltip
          activator="parent"
          location="bottom"
          open-on-click
        >
          {{ getRestWorkTooltip(win) }}
        </v-tooltip>
      </v-chip>
      <v-chip
        v-for="(win, idx) in deduplicatedInvalidWork48"
        :key="'work48-' + new Date(win.windowStart).getTime() + '-' + new Date(win.windowEnd).getTime()"
        rounded
        :color="isRestWorkFixable ? 'anomalySoft' : 'error'"
        variant="tonal"
        size="small"
        class="font-weight-bold cursor-pointer"
        @mouseenter.stop="onIncompatibilityHover(win)"
        @mouseleave="clearRestSegments"
      >
        <v-icon
          start
          icon="mdi-alarm"
        />
        Travail hebdo : {{ formatRestMinutes(win.totalWorkMinutes) }} / 48h
        <v-tooltip
          activator="parent"
          location="bottom"
          open-on-click
        >
          {{ getRestWorkTooltip(win) }}
        </v-tooltip>
      </v-chip>
    </div>
  </div>
</template>

<script setup>
import { formatPairsForDate, formatDateLabel, formatDateSuffix } from '@/utils/compatiblePairsFormat';
import { useShiftStore } from '@/stores/shiftStore';

const shiftStore = useShiftStore();

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
    },
    demand: {
        type: Object,
        default: null
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

const deduplicatedInvalidRest35 = computed(() => {
    const wins = props.compatibility?.invalidRest35 || [];
    const seen = new Map();
    return wins.filter((win) => {
        const key = `${new Date(win.longestRestStart).getTime()}-${new Date(win.longestRestEnd).getTime()}`;
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
    });
});

const deduplicatedInvalidWork48 = computed(() => {
    const wins = props.compatibility?.invalidWork48 || [];
    const seen = new Map();
    return wins.filter((win) => {
        const key = `${new Date(win.windowStart).getTime()}-${new Date(win.windowEnd).getTime()}`;
        if (seen.has(key)) return false;
        seen.set(key, true);
        return true;
    });
});

/** Exclut 35limit et 48hLimit des limits car déjà affichés via les chips Repos hebdo / Travail hebdo */
const filteredLimits = computed(() => {
    const limits = props.compatibility?.limit || [];
    const exclude = [];
    if (deduplicatedInvalidRest35.value?.length > 0) exclude.push('35limit');
    if (deduplicatedInvalidWork48.value?.length > 0) exclude.push('48hLimit');
    return limits.filter(l => !exclude.includes(l));
});

const limitLabels = {
    alreadyWorking: 'Déjà en poste',
    insufficientRest: 'Repos < 11h',
    '35limit': 'Repos hebdo < 35h',
    '48hLimit': 'Semaine > 48h',
    consecutiveDaysLimit: '> 5 jours consécutifs',
    nightControlRestLimit: 'Repos nuit < 12h',
    consecutiveNightLimit: '> 2 nuits consécutives'
};

/** Anomalies modifiables en changeant une vacation élémentaire (demande ou accepter) */
const VARIATION_FIXABLE_LIMITS = new Set([
    'insufficientRest', '35limit', '48hLimit',
    'consecutiveDaysLimit', 'nightControlRestLimit', 'consecutiveNightLimit'
]);

const isVariationFixable = (limit) => VARIATION_FIXABLE_LIMITS.has(limit);

/** Orange uniquement si une modification de vacation élémentaire peut lever l'anomalie (potentiallyCompatible = certaines combinaisons passent) */
const isAnomalyFixableByVariation = (limit) => {
    if (!isVariationFixable(limit)) return false;
    return props.demand?.potentiallyCompatible === true;
};

const isRestWorkFixable = computed(() => props.demand?.potentiallyCompatible === true);

const TOOLTIP_NOT_FIXABLE = 'Ne peut pas être levée en modifiant une vacation élémentaire.';

const isUserAlreadyCompatibleForDate = (dateStr, variations) => {
    const map = shiftStore.persistentVacationsMap;
    const vacation = (map?.value ?? map)?.get?.(dateStr);
    if (!vacation || !variations?.length) return false;
    const userVar = vacation.selectedVariation;
    const userKey = !userVar ? 'default' : (userVar._id || userVar)?.toString?.() ?? null;
    return variations.some(v => v?.isDefault ? userKey === 'default' : (v._id || v)?.toString?.() === userKey);
};

const isUserAlreadyCompatibleForPairsDate = (dateStr, pairs) => {
    const map = shiftStore.persistentVacationsMap;
    const vacation = (map?.value ?? map)?.get?.(dateStr);
    if (!vacation || !pairs?.length) return false;
    const userVar = vacation.selectedVariation;
    const userKey = !userVar ? 'default' : (userVar._id || userVar)?.toString?.() ?? null;
    return pairs.some(p => {
        const fv = p?.fetcherVariation;
        const fvKey = fv?.isDefault ? 'default' : (fv?._id || fv)?.toString?.();
        return fvKey === userKey;
    });
};

/** Texte de compatibilité (même logique que DemandCard.compatibleInfoText) pour les tooltips */
const compatibleInfoForTooltip = computed(() => {
    const demand = props.demand;
    if (!demand) return '';
    const hasPosterVariation = !!demand?.posterShift?.selectedVariation;
    const demandDate = demand?.posterShift?.date;

    if (hasPosterVariation) {
        const byDate = demand?.compatibleFetcherVariationsByDate;
        if (!byDate?.length) return '';
        const filtered = byDate.filter(({ date, variations }) => !isUserAlreadyCompatibleForDate(date, variations));
        if (!filtered.length) return '';
        const names = filtered.map(({ date, shiftName, variations }) => {
            const n = (variations || []).map(v => v?.isDefault ? shiftName : shiftName + (v?.name || '')).filter(Boolean);
            if (!n.length) return '';
            const dateLabel = date === demandDate ? '' : formatDateLabel(date, demandDate);
            return dateLabel ? `${n.join(', ')} (${dateLabel})` : n.join(', ');
        }).filter(Boolean).join(' • ');
        return names ? `Compatible si vous êtes en : ${names}` : '';
    }

    const byDate = demand?.compatiblePairsByFetcherDate;
    if (byDate?.length) {
        const filtered = byDate.filter(({ date, pairs }) => !isUserAlreadyCompatibleForPairsDate(date, pairs));
        if (!filtered.length) return '';
        const pairs = filtered.map((entry) => {
            const { date, shiftName, baseShiftName, pairs: p, totalDemandVariations, totalFetcherVariations } = entry;
            const dateLabel = formatDateLabel(date, demandDate);
            const suffix = formatDateSuffix(dateLabel);
            const pairsText = formatPairsForDate({ pairs: p, baseShiftName, shiftName, totalDemandVariations, totalFetcherVariations });
            return pairsText ? pairsText + suffix : '';
        }).filter(Boolean).join(' • ');
        if (pairs) return `Compatible avec : ${pairs}`;
    }

    const vars = demand?.compatibleVariations;
    if (vars?.length) {
        const baseName = demand?.posterShift?.shift?.name || '';
        const names = vars.map(v => baseName + (v?.name || '')).join(', ');
        return names ? `Compatible avec : ${names}` : '';
    }
    return '';
});

const getLimitTooltip = (limit) => {
    if (!isAnomalyFixableByVariation(limit)) return TOOLTIP_NOT_FIXABLE;
    return compatibleInfoForTooltip.value || 'Précisez ou modifiez la vacation élémentaire du jour de remplacement (modal Demande) ou d\'un jour concerné (calendrier).';
};

const getRestWorkTooltip = (win) => {
    if (!isRestWorkFixable.value) return TOOLTIP_NOT_FIXABLE;
    const start = new Date(win.windowStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const end = new Date(win.windowEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const compat = compatibleInfoForTooltip.value;
    if (compat) return compat;
    return `Précisez la vacation du jour de remplacement ou modifiez celle d'un jour entre le ${start} et le ${end} (calendrier).`;
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

// const formatTimeRange = (startH, endH) => {
//     const format = (h) => {
//         const hh = Math.floor(h);
//         const mm = Math.round((h % 1) * 60);
//         return `${hh}:${mm.toString().padStart(2, '0')}`;
//     };
//     return `${format(startH)} - ${format(endH)}`;
// };

const formatRestMinutes = (minutes) => {
    if (minutes == null) return '0h';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
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

    // Repos 35h : longestRestStart/End ; travail 48h : windowStart/windowEnd
    const rawStart = win.longestRestStart ?? win.windowStart;
    const rawEnd = win.longestRestEnd ?? win.windowEnd;
    if (!rawStart || !rawEnd) return;

    const s = new Date(rawStart);
    const e = new Date(rawEnd);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return;

    const sRawH = s.getUTCHours() + s.getUTCMinutes() / 60;
    const eRawH = e.getUTCHours() + e.getUTCMinutes() / 60;

    // Même referentiel que les work bars : minuit local des composantes UTC
    const toColDate = (d) => new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const colIndexStart = getColIndex(toColDate(s));
    const colIndexEnd = getColIndex(toColDate(e));
    const colCount = processedData.value.columns.length || 13;

    const segments = [];
    const pushSeg = (colIndex, startHour, endHour) => {
        if (colIndex < 0 || colIndex >= colCount) return;
        if (startHour >= endHour) return;
        segments.push({ colIndex, startHour, endHour });
    };

    if (colIndexStart === colIndexEnd) {
        pushSeg(colIndexStart, sRawH, eRawH || 24);
    } else {
        pushSeg(colIndexStart, sRawH, 24);
        for (let colIdx = colIndexStart + 1; colIdx < colIndexEnd; colIdx++) {
            pushSeg(colIdx, 0, 24);
        }
        if (eRawH > 0) {
            pushSeg(colIndexEnd, 0, eRawH);
        }
    }

    activeRestSegments.value = segments;
};

const displayRestSegment = (colIndex, segment) => {
    if (colIndex < 0 || colIndex >= (processedData.value.columns.length || 13)) return;
    activeRestSegments.value = [
        ...activeRestSegments.value,
        { colIndex, ...segment }
    ];
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

// const addToColumn = (colIndex, type, header, additionalProps = {}) => {
//     if (colIndex >= 0 && colIndex < columns.length) {
//         columns[colIndex][type].push({
//             startHour: header.startHour,
//             endHour: header.endHour,
//             ...additionalProps
//         });
//     }
// };

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

        // console.log(s, e)
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
    background-color: rgb(var(--v-theme-primary) / 0.11);
    border: 1px solid rgb(var(--v-theme-primary) / 0.03);
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
    background-color: rgb(var(--v-theme-on-background) / 0.1);
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

/* WORK BARS — Vuetify 4: rgb channels are space-separated; rgba(var(--x), a) is invalid */
.work-bar {
    position: absolute;
    transform: translateX(-50%);
    left: 50%;
    width: 12px;
    background-color: rgb(var(--v-theme-primary) / 0.75);
    border: 1px solid rgb(var(--v-theme-primary));
    border-radius: 8px;
    transition: background-color 0.15s ease, filter 0.15s ease;
    cursor: pointer;
    z-index: 10;
}

.is-horizontal .work-bar {
    transform: translateY(-50%);
    top: 50%;
    left: auto;
    height: 12px;
    border-radius: 4px;
}

.work-bar.is-hovered {
    background-color: rgb(var(--v-theme-primary));
    filter: brightness(1.1);
}

.work-bar.is-demand-shift {
    background-color: rgb(var(--v-theme-error) / 0.2);
    border: 2px dashed rgb(var(--v-theme-error));
    width: 12px;
    z-index: 15;
}

.is-horizontal .work-bar.is-demand-shift {
    width: auto;
    height: 12px;
}

.work-bar.is-demand-shift.is-hovered {
    background-color: rgb(var(--v-theme-error) / 0.5);
}

/* REST BARS */
.rest-bar {
    position: absolute;
    left: 10%;
    right: 10%;
    background-color: transparent;
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
    border: 1px solid rgb(var(--v-theme-primary) / 0.15);
    background-color: rgb(var(--v-theme-primary) / 0.15);
    width: 2px;
    height: 100%;
}

.is-horizontal .rest-bar .rest-bar__inner {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 100%;
    height: 2px;
}

.rest-bar.is-hovered .rest-bar__inner {
    background-color: rgb(var(--v-theme-primary) / 0.85);
}

.rest-bar.is-short-rest .rest-bar__inner {
    background-color: rgb(var(--v-theme-error) / 0.35);
}

.rest-bar.is-short-rest.is-hovered .rest-bar__inner {
    background-color: rgb(var(--v-theme-error) / 0.85);
}

.rest-bar.is-active-hover {
    z-index: 20;
}

.rest-bar.is-active-hover .rest-bar__inner {
    background-color: rgb(var(--v-theme-error));
    width: 4px;
    box-shadow: 0 0 12px rgb(var(--v-theme-error) / 0.45);
}

.is-horizontal .rest-bar.is-active-hover .rest-bar__inner {
    width: 100%;
    height: 4px;
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



.window-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: rgb(var(--v-theme-on-surface) / 0.2);
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
