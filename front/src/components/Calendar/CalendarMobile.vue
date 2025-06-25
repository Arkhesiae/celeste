<template>
  <v-sheet rounded="xl" elevation="0" color="transparent" class="calendar-sheet mx-auto" min-width="300px"
    max-width="600px" v-touch="{
      left: () => handleSwipe('left'),
      right: () => handleSwipe('right')
    }">
    <!-- En-têtes des jours de la semaine -->
    <v-row class="mt-1 mb-8">
      <v-col v-for="day in daysOfWeek" :key="day" class="text-center">
        <strong>{{ day }}</strong>
      </v-col>
    </v-row>

    <!-- Jours du calendrier -->
    <v-row v-for="(week, index) in calendarDays" :key="index"
      class="calendar-row d-flex justify-space-between align-center my-4" dense>
      <div style="height: 48px" v-for="day in week" :key="day.date"
        class="day-container d-flex justify-space-around align-center">
        <v-sheet @click="$emit('select-day', day.date)" color="transparent"
          class="day-block d-flex justify-space-around align-center cursor-pointer overflow-visible"
          style="width: 48px; height: 48px; border-radius: 50%; position: relative; font-weight: 400 " :class="{
            'isWorkDay': isWorkDay(day.date),
            'selected': isSelected(day.date),
            'today-center-highlight': isToday(day.date),
            'empty-day': !day.isInMonth
          }">


          <PendingChip v-if="substitutionStore?.hasOwnPendingDemand(day.date.toISOString())"
            style="bottom:-4px !important; " :date="day.date" />
          <AccepterChip v-if="substitutionStore?.hasAcceptedAsAccepter(day.date.toISOString())"
            style="bottom:-4px !important; " :date="day.date" />
          <ConfirmationChip v-if="substitutionStore?.hasAcceptedAsPoster(day.date.toISOString())"
            style="bottom:-4px !important; " :date="day.date" />
          <!--          <StatusChip v-if="isWorkDay(day.date) && day.date.getDate() === 16" type="switch" status="accepted"/>-->
          <!--          <StatusChip v-if="isWorkDay(day.date) && day.date.getDate() === 17" type="rempla" status="pending"/>-->

          <span class="text-body-2" :style="isWorkDay(day.date) && !inPast(day.date) ? 'font-weight : 900 !important' : 'font-weight : 300'">
            {{ day.date.getUTCDate() }}
          </span>
          <span class="text-caption position-absolute opacity-50" v-if="isWorkDay(day.date)"
            style="top: 0; right: 0;">{{ getShiftName(day.date) }}</span>

          <div style="position: absolute; width: 100%; bottom: 0" class="d-flex justify-center">

            <div class="d-flex justify-center">
              <div v-if="substitutionStore?.hasAvailableSubstitutions(day.date.toISOString())"
                class="indicator-dot remplacement " style="background: rgb(var(--v-theme-remplacement)) !important">
              </div>
              <div v-if="substitutionStore?.hasAvailableSwitches(day.date.toISOString())"
                class="indicator-dot permutation ml-1" style="background: rgb(var(--v-theme-permutation)) !important">
              </div>
              <div v-if="substitutionStore?.hasOtherDemands(day.date.toISOString())"
                class="indicator-dot other-demand ml-1"
                style="background: rgba(var(--v-theme-surfaceContainerHighest), 1) !important"></div>
            </div>

          </div>
        </v-sheet>
      </div>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import { computed } from 'vue';

const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();


const props = defineProps({
  daysOfWeek: Array,
  calendarDays: Array,
  isSelected: Function,
  isToday: Function,

  rotationsMap: Map,
});
const emit = defineEmits(['select-day', 'swipe-left', 'swipe-right']);

const handleSwipe = (direction) => {
  if (direction === 'left') {
    emit('swipe-left');
  } else if (direction === 'right') {
    emit('swipe-right');
  }
};

const shiftsWithSubstitutions = computed(() => {
  return shiftStore.shiftsWithSubstitutions;
});

const vacationsOfUser = computed(() => {
  const map = new Map();
  const shifts = shiftsWithSubstitutions.value;
  if (shifts && shifts.length > 0) {
    shifts.forEach(({ date, shift, teamObject }) => {
      map.set(date, { shift, teamObject });
    });
  }
  return map;
});

const isWorkDay = computed(() => (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString())?.shift;
  return shift ? shift.type !== 'rest' : false;
});

const getShiftName = (date) => vacationsOfUser.value.get(date.toISOString())?.shift?.name;
const getShiftType = (date) => vacationsOfUser.value.get(date.toISOString())?.shift?.type;

const inPast = (date) => {
  return date < new Date();
};


</script>

<style scoped>
.day-container {
  width: calc(100% / 7);
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
  background: rgba(var(--v-theme-surface), 0.5) !important;
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
</style>
