<template>
  <v-sheet rounded="xl" elevation="0" color="transparent">
    <!-- En-têtes des jours de la semaine -->
    <v-row class="mb-4 px-2">
      <v-col v-for="day in daysOfWeek" :key="day" class="text-center">
        <span class="week-day">{{ day }}</span>
      </v-col>
    </v-row>

    <!-- Jours du calendrier -->
    <v-row v-for="(week, index) in calendarDays" :key="index" density="compact">
      <v-col v-for="day in week" :key="day.date">
        <CalendarDayBlock
          :date="day.date"
          :is-in-month="day.isInMonth"
          :is-today="isToday(plainDateToDateStr(day))"
          :selected="isSelected(plainDateToDateStr(day))"
          v-bind="getShiftData(plainDateToDateStr(day))"
          :demands="demandsForDate(plainDateToDateStr(day))"
          :has-available-substitutions="hasAvailableSubstitutions(plainDateToDateStr(day))"
          :has-available-switches="hasAvailableSwitches(plainDateToDateStr(day))"
          :has-other-demands="hasOtherDemands(plainDateToDateStr(day))"
          :rest="workOf(plainDateToDateStr(day))?.rest ?? null"
          :window-lines="linesFor(plainDateToDateStr(day))"
          :in-period="inPeriod(plainDateToDateStr(day))"
          @inspect-window="emit('inspect-window', $event)"
          class=""
          :height="86"
          :class="{
            'top-left-corner': index === 0 && week.indexOf(day) === 0,
            'top-right-corner': index === 0 && week.indexOf(day) === week.length - 1,
            'bottom-left-corner': index === calendarDays.length - 1 && week.indexOf(day) === 0,
            'bottom-right-corner': index === calendarDays.length - 1 && week.indexOf(day) === week.length - 1,
          }"
          @select="selectDate"
        />
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { posterDay } from '@/utils/dayFields.js';
import { Temporal } from '@js-temporal/polyfill';
import { useShiftStore } from '@/stores/shiftStore';
import { useDemandStore } from '@/stores/demandStore';
import { getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { entryTypeOf } from '@/utils/entryIcons';
import { dayKindOf } from '@/utils/dayStyle';
import { sameDateKey, toDateKey } from '@/utils/dateKey';
import { useWorkIndicators } from '@/composables/useWorkIndicators';

const demandStore = useDemandStore();
const shiftStore = useShiftStore();

const props = defineProps({
  calendarDays: Array,
  selectedDate: {
    type: [String, null],
    default: null,
  },
  /** Période choisie ({ start, end }, `end` absent tant que le deuxième jour n'est pas choisi) */
  period: {
    type: Object,
    default: null,
  },
  isSelected: Function,
});

const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const { workOf, linesFor, inPeriod } = useWorkIndicators(toRef(props, 'period'));

const emit = defineEmits(['update:selectedDate', 'swipe-left', 'swipe-right', 'inspect-window']);

const selectDate = (date) => {
  emit('update:selectedDate', date.toString());
};

const plainDateToDateStr = (plainDate) => {
  return plainDate?.date?.toString();
};

const toDateStr = (date) => toDateKey(date);

const isSelected = (dateStr) => {
  // Les deux jours de la période choisie s'affichent comme sélectionnés
  return toDateKey(props.selectedDate) === dateStr || props.period?.start === dateStr || props.period?.end === dateStr;
};

const isToday = (dateStr) => {
  const now = Temporal.Now.plainDateISO();
  const todayStr = now.toString();
  return dateStr === todayStr;
};

// ── Shift maps ────────────────────────────────────────────────────────────────

const shiftDataMap = computed(() => {
  const map = new Map();
  for (const [key, value] of shiftStore.persistentVacationsMap) {
    // Remplacé, l'agent ne tient plus de vacation : la tuile montre celle qu'il a cédée (barrée)
    const shown = value?.shiftData?.shift ?? (value?.presence === 'replaced' ? value.substitution?.gave?.shift : null);
    map.set(key, {
      isWorkDay: !!shown && shown.type !== 'rest',
      comment: value?.comment ?? '',
      presence: value?.presence ?? 'present',
      shiftName: getDisplayShiftName(value),
      selectedVariation: value?.shiftData?.selectedVariation ?? null,
      variationName: value?.shiftData?.selectedVariation?.name ?? null,
      // Nature du jour (couleur commune au calendrier et à la grille, styles/day.css) ; pour une affectation (congé, formation...)
      // l'icône remplace le nom de la vacation
      kind: dayKindOf({ type: value?.type, shiftType: shown?.type, variation: value?.shiftData?.selectedVariation }),
      icon: (() => {
        const entry = entryTypeOf(value?.type);
        return entry ? `mdi-${entry.icon}` : null;
      })(),
    });
  }
  return map;
});

const getShiftData = (dateStr) => shiftDataMap.value.get(dateStr) ?? {};

const hasAvailableSubstitutions = (dateStr) =>
  dateStr
    ? demandStore.availableSubstitutions.some((demand) => sameDateKey(posterDay(demand), dateStr))
    : false;
const hasAvailableSwitches = (dateStr) =>
  dateStr
    ? demandStore.availableSwitches.some((demand) => sameDateKey(posterDay(demand), dateStr))
    : false;
const hasOtherDemands = (dateStr) =>
  dateStr
    ? demandStore.otherDemands.some((demand) => sameDateKey(posterDay(demand), dateStr))
    : false;

const demandsMap = computed(() => {
  const map = new Map();
  const all = [
    ...demandStore.ownPendingHybridSubstitutions,
    ...demandStore.ownPendingTrueSubstitutions,
    ...demandStore.ownPendingTrueSwitches,
    ...demandStore.acceptedAsAccepter,
    ...demandStore.acceptedAsPoster,
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const demand of all) {
    const key = toDateStr(posterDay(demand));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(demand);
  }
  return map;
});

const demandsForDate = (dateStr) => (dateStr ? (demandsMap.value.get(dateStr) ?? []) : []);
</script>

<style scoped>
.calendar-day {
  position: relative;
  min-height: 70px;
}

.secondary {
  background: rgb(var(--v-theme-secondary));
}

.tertiary {
  background: rgb(var(--v-theme-tertiary));
}

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

.top-left-corner {
  border-top-left-radius: 24px !important;
}

.top-right-corner {
  border-top-right-radius: 24px !important;
}

.bottom-left-corner {
  border-bottom-left-radius: 24px !important;
}

.bottom-right-corner {
  border-bottom-right-radius: 24px !important;
}

.day-number {
  font-weight: 700 !important;
  opacity: 0.9;
  font-size: 14px !important;
}

.shift-name {
  font-weight: 700 !important;
  opacity: 0.6;
  font-size: 14px !important;
}

.variation-name {
  font-weight: 400 !important;
  opacity: 0.6;
  font-size: 14px !important;
}

.week-day {
  font-size: 0.675rem !important;
  font-weight: 500 !important;
  opacity: 0.5;
}
</style>
