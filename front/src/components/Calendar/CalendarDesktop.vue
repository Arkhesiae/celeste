<template>
  <v-sheet rounded="xl" elevation="0" color="transparent">
    <!-- En-têtes des jours de la semaine -->
    <v-row class=" mb-4 px-2">
      <v-col v-for="day in daysOfWeek" :key="day" class="text-center">
        <span class="week-day">{{ day }}</span>
      </v-col>
    </v-row>

    <!-- Jours du calendrier -->
    <v-row v-for="(week, index) in calendarDays" :key="index" density="compact">
      <v-col v-for="day in week" :key="day.date">
        <CalendarDayBlock :date="day.date" :is-in-month="day.isInMonth" :is-today="isToday(plainDateToDateStr(day))"
          :selected="isSelected(plainDateToDateStr(day))" v-bind="getShiftData(plainDateToDateStr(day))"
          :demands="demandsForDate(plainDateToDateStr(day))"
          :has-available-substitutions="hasAvailableSubstitutions(plainDateToDateStr(day))"
          :has-available-switches="hasAvailableSwitches(plainDateToDateStr(day))"
          :has-other-demands="hasOtherDemands(plainDateToDateStr(day))" class="pa-3" :height="86" :class="{
            'top-left-corner': index === 0 && week.indexOf(day) === 0,
            'top-right-corner': index === 0 && week.indexOf(day) === week.length - 1,
            'bottom-left-corner': index === calendarDays.length - 1 && week.indexOf(day) === 0,
            'bottom-right-corner': index === calendarDays.length - 1 && week.indexOf(day) === week.length - 1,
          }" @select="selectDate" />
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { useShiftStore } from '@/stores/shiftStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { entryTypes } from '@/utils/entryIcons';

const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();

const props = defineProps({
  calendarDays: Array,
  isSelected: Function,
  rotationsMap: Map,
});


const daysOfWeek = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const emit = defineEmits(['update:selectedDate', 'swipe-left', 'swipe-right']);

const selectDate = (date) => {
  emit('update:selectedDate', date.toString());
};

const plainDateToDateStr = (plainDate) => {
  return plainDate?.date?.toString();
}

const toDateStr = (date) => {
  return date?.slice(0, 10);
}

const isSelected = (dateStr) => {
  return props.selectedDate === dateStr;
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
    map.set(key, {
      isWorkDay: !!value?.shiftData?.shift && value.shiftData.shift.type !== 'rest',
      isOff: value?.isOff ?? false,
      shiftName: getDisplayShiftName(value),
      selectedVariation: value?.shiftData?.selectedVariation ?? null,
      variationName: value?.shiftData?.selectedVariation?.name ?? null,
      icon: (() => {
        const entry = entryTypes.find((e) => e.key === value?.type);
        return entry ? `mdi-${entry.icon}` : null;
      })(),
    });
  }
  return map;
});

const getShiftData = (dateStr) => shiftDataMap.value.get(dateStr) ?? {};

const hasAvailableSubstitutions = (dateStr) => dateStr ? substitutionStore.availableSubstitutions.some(substitution =>
  substitution.posterShift.date.slice(0, 10) === dateStr
) : [];
const hasAvailableSwitches = (dateStr) => dateStr ? substitutionStore.availableSwitches.some(substitution =>
  substitution.posterShift.date.slice(0, 10) === dateStr
) : [];
const hasOtherDemands = (dateStr) => dateStr ? substitutionStore.otherDemands.some(substitution =>
  substitution.posterShift.date.slice(0, 10) === dateStr
) : [];

const demandsMap = computed(() => {
  const map = new Map();
  const all = [
    ...substitutionStore.ownPendingHybridSubstitutions,
    ...substitutionStore.ownPendingTrueSubstitutions,
    ...substitutionStore.ownPendingTrueSwitches,
    ...substitutionStore.acceptedAsAccepter,
    ...substitutionStore.acceptedAsPoster,
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const demand of all) {
    const key = toDateStr(demand.posterShift.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(demand);
  }
  return map;
});

const demandsForDate = (dateStr) => dateStr ? (demandsMap.value.get(dateStr) ?? []) : [];

</script>

<style scoped>
.calendar-day {
  position: relative;
  min-height: 70px;
}

.indicator-dot {
  height: 8px;
  width: 8px;
  border-radius: 8px;
}

.secondary {
  background: rgb(var(--v-theme-secondary));
}

.tertiary {
  background: rgb(var(--v-theme-tertiary));
}



.today-center-highlight {

  border: 1px solid rgba(var(--v-theme-onBackground), 0.25)
}

.isWorkDay {

  color: rgb(var())
}

.offDay {
  color: rgb(var(--v-theme-error)) !important;
  opacity: 0.8 !important;
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

.mod-dot {
  height: 4px;
  width: 4px;
  border-radius: 6px;
  background-color: rgba(var(--v-theme-onSurfaceVariant), 0.5);

}

.week-day {
  font-size: .675rem !important;
  font-weight: 500 !important;
  opacity: .5;
}
</style>
