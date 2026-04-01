<template>
  <v-sheet v-touch="{
    left: () => handleSwipe('left'),
    right: () => handleSwipe('right')
  }" rounded="xl" elevation="0" color="transparent" class="calendar-sheet mx-auto" min-width="300px" max-width="600px">
    <v-row class=" mb-4 px-2">
      <v-col v-for="day in daysOfWeek" :key="day" class="text-center">
        <span class="week-day">{{ day }}</span>
      </v-col>
    </v-row>

    <v-row v-for="(week, index) in calendarDays" :key="index"
      class=" px-2   d-flex justify-space-between align-center my-1 ga-1 ">
      <v-col v-for="day in week" :key="day.date" style="height: 64px"
        class="ma-0 pa-0 d-flex justify-space-around align-center">
        <div class="day-block d-flex cursor-pointer overflow-hidden"
          style=" background-color: rgba(var(--v-theme-surfaceContainerHigh), 1) ; position: relative; font-weight: 400 " :class="{
            'isWorkDay': isWorkDay(day.date),
            'selected': isSelected(day.date),
            'today-center-highlight': isToday(day.date),
            'empty-day': !day.isInMonth
          }" @click="hapticsImpact(); $emit('select-day', day.date)">


          <div class="d-flex justify-space-between align-center px-2 ">
            <div  class="day_label_container align-self-start align-center">
              <span class="text-body-2 "
                :style="isWorkDay(day.date) && !inPast(day.date) ? 'font-weight : 900 !important' : 'font-weight : 400'"
                :class="{ 'xs': xs }">
                {{ day.date.getUTCDate() }}
              </span>



            </div>
              <div class="shift_container align-self-end align-center opacity-70" :class="inPast(day.date) ? 'text-disabled' : ''">
                <div v-if="isWorkDay(day.date)" class="shift-name" :class="isOff(day.date) ? 'offDay' : ''">
                   <span class=" "> {{ getShiftName(day.date) }}</span>
                </div>
                <div v-else-if="getIcon(day.date)" class="d-flex shift-name align-center">
                  <v-icon size="12px">{{ getIcon(day.date) }}</v-icon>
                </div>
              </div>
            </div>
      

            <div class="d-flex justify-center position-absolute mb-1 mr-1" style="bottom: 0; right: 0;">
            <div v-for="(demand, index) in demandsForDate(day.date)" :key="demand.id">
              <DemandChip :order="index + 1" :demand="demand" :date="day.date" />
            </div>
            <div v-if="demandsForDate(day.date).length > 1" class="chipe position-absolute "
              style="top: 50%; left: -5px;">
              <v-icon size="14px" color="onPrimary"> mdi-plus</v-icon>
              <!-- <span class="text-caption" v-if="demandsForDate(day.date).length > 1"> + {{ demandsForDate(day.date).length - 1 }}</span> -->
            </div>
          </div>

            <div v-if="!acceptedAsAccepter(day.date) && !acceptedAsPoster(day.date) && !pendingDemand(day.date)"
              style="position: absolute; bottom: 8px ; left: 8px" class="d-flex justify-center ">
              <div class="d-flex justify-center ga-1">
                <div v-if="substitutionStore?.hasAvailableSubstitutions(day.date.toISOString())"
                  class="indicator-dot remplacement " style="background: rgb(var(--v-theme-primary)) !important" />
                <div v-if="substitutionStore?.hasAvailableSwitches(day.date.toISOString())"
                  class="indicator-dot permutation " style="background: rgb(var(--v-theme-primary)) !important" />
                <div v-if="substitutionStore?.hasOtherDemands(day.date.toISOString())"
                  class="indicator-dot other-demand" style="background: rgba(var(--v-theme-error), .3) !important" />
              </div>
            </div>
          </div>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import { getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useDisplay } from 'vuetify';
import { entryTypes } from '@/utils/entryIcons';

const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();
const { xs } = useDisplay();

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

const hapticsImpact = async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
};


const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
});

const isWorkDay = computed(() => (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString().split('T')[0])?.shiftData?.shift;
  return shift ? shift.type !== 'rest' : false;
});

const isOff = computed(() => (date) => {
  return vacationsOfUser.value.get(date.toISOString().split('T')[0])?.isOff;
});

const pendingDemand = computed(() => (date) => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
].find(d => d.posterShift.date === date.toISOString()));

const acceptedAsAccepter = computed(() => (date) => {
  if (!date) return null;
  return substitutionStore.acceptedAsAccepter.find(d => d.posterShift.date === date.toISOString());
});

const acceptedAsPoster = computed(() => (date) => {
  if (!date) return null;
  return substitutionStore.acceptedAsPoster.find(d => d.posterShift.date === date.toISOString());
});

const getShiftName = (date) => {
  const dateKey = date.toISOString().split('T')[0];
  return getDisplayShiftName(vacationsOfUser.value.get(dateKey));
};

// const getShiftType = (date) => vacationsOfUser.value.get(date.toISOString().split('T')[0])?.shift?.type;

const inPast = (date) => {
  return date < new Date();
};
// Normalize once for consistent comparison
const toDateStr = (date) => new Date(date).toISOString().split('T')[0];



// Single flat array of all relevant demands, computed once
const allDemands = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches,
  ...substitutionStore.acceptedAsAccepter,
  ...substitutionStore.acceptedAsPoster,
].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));

// Simple filter function — no computed wrapper needed
const demandsForDate = (date) => {
  if (!date) return [];
  const dateStr = toDateStr(date);
  return allDemands.value.filter(d => toDateStr(d.posterShift.date) === dateStr);
};


const getIcon = (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString().split('T')[0]);
  const entry = entryTypes.find((entry) => entry.key === shift?.type);
  return entry ? "mdi-" + entry.icon : null;
}

</script>

<style scoped>
.offDay {
  color: rgb(var(--v-theme-error)) !important;
  opacity: 0.5 !important;

}

.day-block {
  width: 100% !important;
  padding-top: 6px;
  height: 64px;
  display: grid;
  flex-direction: column;
  border-radius: 12px;
  transition: border-radius var(--motion-expressive-default-effects);
}

.week-day {
  font-size: .600rem !important;
  font-weight: 500 !important;
  opacity: .5;
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

.shift_container {
  display: flex;
  justify-content: center;
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



.day_label_container span {
  position: relative;
  font-size: 12px !important;
  font-weight: 500 !important;
}

.day_label_container span.xs {
  font-size: 11px !important;
  font-weight: 500 !important;
}


.shift-name {
 
  font-size: .600rem !important;

}
</style>
