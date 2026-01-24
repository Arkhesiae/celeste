<template>
  <v-sheet
    v-touch="{
      left: () => handleSwipe('left'),
      right: () => handleSwipe('right')
    }"
    rounded="xl"
    elevation="0"
    color="transparent"
    class="calendar-sheet mx-auto"
    min-width="300px"
    max-width="600px"
  >
    <v-row class="mt-1 mb-8">
      <v-col
        v-for="day in daysOfWeek"
        :key="day"
        class="text-center"
      >
        <span class="week-day">{{ day }}</span>
      </v-col>
    </v-row>

    <v-row
      v-for="(week, index) in calendarDays"
      :key="index"
      class="calendar-row d-flex justify-space-between align-center my-4"
      dense
    >
      <div
        v-for="day in week"
        :key="day.date"
        style="height: 48px"
        class="day-container d-flex justify-space-around align-center"
      >
        <v-sheet
          color="transparent"
          class="day-block d-flex justify-space-around align-center cursor-pointer overflow-visible"
          style="width: 48px; height: 48px; border-radius: 50%; background-color: rgba(var(--v-theme-surface), 1) !important; position: relative; font-weight: 400 "
          :class="{
            'isWorkDay': isWorkDay(day.date),
            'selected': isSelected(day.date),
            'today-center-highlight': isToday(day.date),
            'empty-day': !day.isInMonth
          }"
          @click="hapticsImpact(); $emit('select-day', day.date) "
        >
          <PendingChip
            v-if="pendingDemand(day.date)"
            style="bottom:-4px !important; "
            :date="day.date"
          />
          <AccepterChip
            v-if="acceptedAsAccepter(day.date)"
            style="bottom:-4px !important; "
            :date="day.date"
          />
          <ConfirmationChip
            v-if="acceptedAsPoster(day.date)"
            style="bottom:-4px !important; "
            :date="day.date"
          />

          <span
            class="text-body-2 day"
            :style="isWorkDay(day.date) && !inPast(day.date) ? 'font-weight : 900 !important' : 'font-weight : 300'"
            :class="{'xs': xs}"
          >
            {{ day.date.getUTCDate() }}
          </span>


          <span
            v-if="isWorkDay(day.date) || isOff(day.date)"
            class="text-caption position-absolute opacity-50 shift-name"
            
            :class="{'offDay': isOff(day.date), 'xs': xs}"
          >{{ getShiftName(day.date) }}</span>

          <div
            v-if="!acceptedAsAccepter(day.date) && !acceptedAsPoster(day.date) && !pendingDemand(day.date)"
            style="position: absolute; width: 100%; bottom: 4px"
            class="d-flex justify-center "
          >
            <div class="d-flex justify-center ga-1">
              <div
                v-if="substitutionStore?.hasAvailableSubstitutions(day.date.toISOString())"
                class="indicator-dot remplacement "
                style="background: rgb(var(--v-theme-primary)) !important"
              />
              <div
                v-if="substitutionStore?.hasAvailableSwitches(day.date.toISOString())"
                class="indicator-dot permutation "
                style="background: rgb(var(--v-theme-primary)) !important"
              />
              <div
                v-if="substitutionStore?.hasOtherDemands(day.date.toISOString())"
                class="indicator-dot other-demand"
                style="background: rgba(var(--v-theme-error), .3) !important"
              />
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

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useDisplay } from 'vuetify';

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

const hapticsImpact= async () => {
  await Haptics.impact({ style: ImpactStyle.Light });
};


const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
});

const isWorkDay = computed(() => (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString().split('T')[0])?.shift;
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
  if (vacationsOfUser.value.get(date.toISOString().split('T')[0])?.isOff) {
    
      return vacationsOfUser.value.get(date.toISOString().split('T')[0])?.initialShift?.name;
  } 

  const shift = vacationsOfUser.value.get(date.toISOString().split('T')[0])?.shift
  return shift ? shift.name : '';
};

// const getShiftType = (date) => vacationsOfUser.value.get(date.toISOString().split('T')[0])?.shift?.type;

const inPast = (date) => {
  return date < new Date();
};



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

.xs {
  font-size: 10px !important;
  font-weight: 500 !important;
}

.day.xs {
  position: relative;
 
  font-size: .6750rem !important;
  font-weight: 300 !important;
}

.shift-name {
  position: relative;
  top: 2px;
  font-size: .600rem !important;

}
</style>
