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
        <v-card
          width="100%"
          min-width="100%"
          flat
       
          :color="getColor(day.date)"
          class="d-flex flex-column calendar-day pa-0 overflow-visible"
          @click="$emit('select-day', day.date)"
          :style="{
            'border-radius': '16px !important',
            'opacity': getOpacity(day)
          }"
          :class="{
            'isWorkDay': isWorkDay(day.date),
            'today-center-highlight': isToday(day.date),
           
      
  
          }"
        >
         

          <!-- Contenu principal de la carte -->
          <v-card-item class="py-3 pt-2  "> 
            <v-card-title :style="isWorkDay(day.date) ? 'font-weight : 900 !important' : 'font-weight : 500'">{{ day.date.getUTCDate() }}</v-card-title>
          </v-card-item>

          
          <PendingChip v-if="substitutionStore.hasOwnPendingDemand(day.date.toISOString())" style="bottom:8px !important; right: 8px !important" :date="day.date"/>
          <AccepterChip v-if="substitutionStore.hasAcceptedAsAccepter(day.date.toISOString())" style="bottom:8px !important; right: 8px !important" :date="day.date"/>
          <ConfirmationChip v-if="substitutionStore.hasAcceptedAsPoster(day.date.toISOString())" style="bottom:8px !important; right: 8px !important" :date="day.date"/>
          <!-- <StatusChip v-if="getStatus(day.date.toISOString()) !== ''" style="bottom:8px !important; right: 8px !important" :date="day.date.toISOString()" :status="getStatus(day.date.toISOString())"/> -->


          <div class="d-flex justify-space-between align-center px-4">
 <!-- Informations du shift -->
 <v-card-subtitle class="pa-0" v-if=" getShiftType(day.date) !== 'rest'">
            {{ getShiftName(day.date) }}
                  
          </v-card-subtitle>
              <!-- Indicateurs de substitution -->
          <div  class="position-absolute pr-4 pb-4" style="bottom: 0; right: 0;">
            <div class="d-flex justify-center">
              <div 
                v-if="substitutionStore.hasAvailableSubstitutions(day.date.toISOString())"
                class="indicator-dot remplacement "
                style="background: rgb(var(--v-theme-remplacement)) !important" 
              ></div>
              <div 
                v-if="substitutionStore.hasAvailableSwitches(day.date.toISOString())"
                class="indicator-dot permutation ml-1"
                style="background: rgb(var(--v-theme-permutation)) !important"
              ></div>
              <div 
                v-if="substitutionStore.hasOtherDemands(day.date.toISOString())"
                class="indicator-dot other-demand ml-1"
                style="background: rgba(var(--v-theme-background), 1) !important"
              ></div>
            </div>
          </div>      
          </div>
         
      
        </v-card>
      </v-col>
    </v-row>
  </v-sheet>
</template>

<script setup>
import {defineProps, defineEmits} from 'vue';
import { useShiftStore } from '@/stores/shiftStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { computed } from 'vue';


const substitutionStore = useSubstitutionStore();
const shiftStore = useShiftStore();

const props = defineProps({
  daysOfWeek: Array,
  calendarDays: Array,
  isSelected: Function,
  isToday: Function,
  vacationsOfUser: Map,
  rotationsMap: Map,
});


const isWorkDay = (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString())?.shift;
  return shift ? shift.type !== 'rest' : false;
};


const getColor = (date) => {
  if (props.isSelected(date)) {
    return 'onBackground';
  // } else if (substitutionStore.hasAcceptedSubstitutionsAsAccepter(date.toISOString())) {
  //   return 'remplacement';
  }  else if (isWorkDay(date) && !inPast(date)) {
    return 'surfaceContainerHigh';
    }  else {
    return 'surface';
  }
};

const getOpacity = (day) => {
  if (props.isSelected(day.date)) {
    return 0.9;
  } else if (isWorkDay(day.date) && !inPast(day.date)) {
    return 1;
  } else if (!day?.isInMonth) {
    return 0.21;
  } else {
    return 0.8;
  }
};

const inPast = (date) => {
  return date <= new Date().setHours(0, 0, 0, 0);
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


const getShiftName = (date) => vacationsOfUser.value.get(date.toISOString())?.shift?.name;
const getShiftType = (date) => vacationsOfUser.value.get(date.toISOString())?.shift?.type;

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
 
  border : 1px solid  rgba(var(--v-theme-onBackground), 0.25)
}

.isWorkDay {

  color: rgb(var())
}



.remplacement {
  background: rgb(var(--v-theme-remplacement)) !important;
}

.permutation {
  background: rgb(var(--v-theme-permutation)) !important;
}


</style>
