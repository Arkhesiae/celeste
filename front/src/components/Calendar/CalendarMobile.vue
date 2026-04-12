<template>
  <div>
    <v-row class="mb-4 px-2">
      <v-col v-for="day in daysOfWeek" :key="day" class="text-center">
        <span class="week-day">{{ day }}</span>
      </v-col>
    </v-row>

    <v-fade-transition mode="out-in"> 
    <div v-if="loadingVacations">
      <v-row v-for="week in 6" :key="`skel-${week}`" class="px-4 d-flex justify-space-between align-center my-1 ga-1">
        <v-col v-for="day in 7" :key="`skel-day-${day}`" class="ma-0 pa-0 d-flex justify-space-around align-center">
          <v-skeleton-loader type="list-item-two-line"  :height="64" width="100%" style="border-radius: 12px;" />
        </v-col>
      </v-row>
    </div>

    <div v-else>
      <v-row v-for="(week, index) in calendarDays" :key="index"
        class="px-4 d-flex justify-space-between align-center my-1 ga-1">
        <v-col v-for="day in week" :key="day.toString()" class="ma-0 pa-0 d-flex justify-space-around align-center">
          <CalendarDayBlock :date="day.date" :is-in-month="day.isInMonth" :is-today="isToday(plainDateToDateStr(day))"
            :selected="isSelected(plainDateToDateStr(day))" v-bind="getShiftData(plainDateToDateStr(day))"
            :demands="demandsForDate(plainDateToDateStr(day))"
            :has-available-substitutions="hasAvailableSubstitutions(plainDateToDateStr(day))"
            :has-available-switches="hasAvailableSwitches(plainDateToDateStr(day))"
            :has-other-demands="hasOtherDemands(plainDateToDateStr(day))" :height="64"
            @select="selectDate" />
        </v-col>
      </v-row>
    </div>
  </v-fade-transition>
  </div>
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import { getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { entryTypes } from '@/utils/entryIcons';

const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();

const props = defineProps({
  calendarDays: Array,
  loadingVacations: Boolean,
  rotationsMap: Map,
  selectedDate: [String, null],
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
.offDay {
  color: rgb(var(--v-theme-error)) !important;
  opacity: 0.5 !important;

}

.week-day {
  font-size: .600rem !important;
  font-weight: 500 !important;
  opacity: .5;
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
  opacity: .9;
  white-space: nowrap;
  /* overflow: hidden; */
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
  opacity: .9;

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

.calendar-sheet {
  touch-action: pan-y pinch-zoom;
}


.chip-container {
  position: absolute;
  bottom: 0px;
  padding-bottom: 4px;
  padding-left: 4px;
  padding-right: 4px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.shift_container {
  opacity: .9;
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
