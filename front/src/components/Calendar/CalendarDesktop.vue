<template>
  <v-sheet rounded="xl" elevation="0" color="transparent">
    <!-- En-têtes des jours de la semaine -->
    <v-row class="mt-1">
      <v-col v-for="day in daysOfWeek" :key="day" class="text-center">
        <strong>{{ day }}</strong>
      </v-col>
    </v-row>

    <!-- Jours du calendrier -->
    <v-row v-for="(week, index) in calendarDays" :key="index" class="calendar-row" dense>
      <v-col v-for="day in week" :key="day.date">
        <v-card width="100%" min-width="100%" flat :color="getColor(day.date)"
          class="d-flex flex-column calendar-day pa-0 overflow-visible" :style="{
            'opacity': getOpacity(day)
          }" :class="{
            'isWorkDay': isWorkDay(day.date),
            'today-center-highlight': isToday(day.date),
            'top-left-corner': index === 0 && week.indexOf(day) === 0,
            'top-right-corner': index === 0 && week.indexOf(day) === week.length - 1,
            'bottom-left-corner': index === calendarDays.length - 1 && week.indexOf(day) === 0,
            'bottom-right-corner': index === calendarDays.length - 1 && week.indexOf(day) === week.length - 1,


          }" @click="$emit('select-day', day.date)">
          <!-- Contenu principal de la carte -->

          <div class="d-flex justify-space-between px-4 pt-2 align-center  w-100">
            <span :style="isWorkDay(day.date) ? 'font-weight : 900 !important' : 'font-weight : 500'">
              {{ day.date.getUTCDate() }}
            </span>

            <div v-if="isWorkDay(day.date)" class="pa-0 shift-name" :class="isOff(day.date) ? 'offDay' : ''">
              {{ getShiftName(day.date) }}
            </div>
            <div v-else-if="getIcon(day.date)" class="d-flex shift-name align-center">
              <v-icon size="16px">{{ getIcon(day.date) }}</v-icon>

            </div>
          </div>



          <div class="d-flex justify-center position-absolute mb-2 mr-2" style="bottom: 0; right: 0;">
            <div v-for="(demand, index) in demandsForDate(day.date)" :key="demand.id">    
              <DemandChip :order="index + 1" :demand="demand"  :date="day.date"  />
            </div>
            <!-- <div v-if="demandsForDate(day.date).length > 1" class="chipe position-absolute " style="top: 50%; left: -5px;">
              <v-icon size="14px" color="onPrimary"> mdi-plus</v-icon>
              <!-- <span class="text-caption" v-if="demandsForDate(day.date).length > 1"> + {{ demandsForDate(day.date).length - 1 }}</span> -->
            <!-- </div> -->
          </div>

          <!-- <StatusChip v-if="getStatus(day.date.toISOString()) !== ''" style="bottom:8px !important; right: 8px !important" :date="day.date.toISOString()" :status="getStatus(day.date.toISOString())"/> -->



          <div class="d-flex justify-center position-absolute mb-4 ml-4" style="bottom: 0; left: 0;">
            <div v-if="substitutionStore.hasAvailableSubstitutions(day.date.toISOString())"
              class="indicator-dot remplacement " style="background: rgb(var(--v-theme-primary)) !important" />
            <div v-if="substitutionStore.hasAvailableSwitches(day.date.toISOString())"
              class="indicator-dot permutation ml-1" style="background: rgb(var(--v-theme-primary)) !important" />
            <div v-if="substitutionStore.hasOtherDemands(day.date.toISOString())"
              class="indicator-dot other-demand ml-1"
              style="background: rgba(var(--v-theme-error), .3) !important; border: 1px solid rgba(var(--v-theme-onBackground), 0.05) !important" />
          </div>


        </v-card>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import { useShiftStore } from '@/stores/shiftStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { entryTypes } from '@/utils/entryIcons';
import { useAuthStore } from '@/stores/authStore';


const authStore = useAuthStore();
const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();

const props = defineProps({
  daysOfWeek: Array,
  calendarDays: Array,
  isSelected: Function,
  isToday: Function,
  rotationsMap: Map,
});


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

const isPending = (demand) =>
  demand.status === 'open' || demand.status === 'pending';

const isAcceptedAsPoster = (demand) =>
  demand.status === 'accepted' &&
  demand.posterId === authStore.userData.userId;

const isAcceptedAsAccepter = (demand) =>
  demand.status === 'accepted' &&
  demand.accepterId === authStore.userData.userId;


const getColor = (date) => {
  if (props.isSelected(date)) {
    return 'onBackground';
    // } else if (substitutionStore.hasAcceptedSubstitutionsAsAccepter(date.toISOString())) {
    //   return 'remplacement';
  } else if (isWorkDay(date) && !inPast(date)) {
    return 'surfaceContainerHigh';
  } else {
    return 'surface';
  }
};

const getIcon = (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString().split('T')[0]);
  const entry = entryTypes.find((entry) => entry.key === shift?.type);
  return entry ? "mdi-" + entry.icon : null;
}

const getOpacity = (day) => {
  if (props.isSelected(day.date)) {
    return 0.9;
  } else if (isWorkDay(day.date) && !inPast(day.date) && (day?.isInMonth)) {
    return 1;
  } else if (isWorkDay(day.date) && !inPast(day.date) && (!day?.isInMonth)) {
    return 0.60;
  } else if (!day?.isInMonth) {
    return 0.21;
  } else {
    return 0.8;
  }
};

const inPast = (date) => {
  return date <= new Date().setHours(0, 0, 0, 0);
};




const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
});

const isWorkDay = (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString().split('T')[0])?.shiftData?.shift;
  return shift ? shift.type !== 'rest' : false;
};



const icon = (date) => {
  const type = vacationsOfUser.value.get(date.toISOString().split('T')[0])?.type;
  return getTypeIcon(type);
};

const isOff = (date) => {

  return vacationsOfUser.value.get(date.toISOString().split('T')[0])?.isOff;
};

const getShiftName = (date) => {
  const dateKey = date.toISOString().split('T')[0];
  return getDisplayShiftName(vacationsOfUser.value.get(dateKey));
}

const getShiftType = (date) => vacationsOfUser.value.get(date.toISOString().split('T')[0])?.shift?.type;

// const getStatus = (date) => {
//   if (substitutionStore.hasAcceptedSubstitutionsAsAccepter(date)) {
//     return 'accepted-accepter';
//   }
//   if (substitutionStore.hasAcceptedSubstitutionsAsPoster(date)) {
//     return 'accepted-poster';
//   }
//   if (substitutionStore.hasOwnOpenSubstitutions(date)) {
//     return 'pending';
//   }
//   return '';
// };


const emit = defineEmits(['select-day']);


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
  opacity: 0.5 !important;
}

.chipe {
  height:14px;
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

.shift-name {
  font-weight: 700 !important;
  opacity: 0.6;
  font-size: 14px !important;
}


.remplacement {
  background: rgb(var(--v-theme-remplacement)) !important;
}

.permutation {
  background: rgb(var(--v-theme-permutation)) !important;
}
</style>
