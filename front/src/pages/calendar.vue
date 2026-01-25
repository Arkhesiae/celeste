<template>
  <v-container>
    <v-alert
      v-if="!activeRotation"
      color="error"
      variant="tonal"
      rounded="xl"
      class="mb-4 pa-4"
      icon="mdi-alert-outline"
      style="cursor: pointer;"
      @click="router.push('/profile/'+authStore.userData.userId)"
    >
      <div class="d-flex align-center justify-space-between">
        <div>
          <v-card-title class="text-h6 font-weight-medium">
            Aucun tour de service actif
          </v-card-title>
          <v-card-text>
            <div class="text-medium-emphasis">
              Aucun tour de service n'est actuellement actif.
            </div>
            <div>
              Sans tour de service actif, vous ne pourrez pas effectuer de remplacements ou de permutations. Veuillez contacter un administrateur pour activer un tour de service.
            </div>
          </v-card-text>
        </div>
      </div>
    </v-alert> 
    <v-row class="mt-16">
      <!-- Section Calendrier --> 

      <v-col
        cols="12"
        lg="8"
        class=""
      >
        <CalendarHeader
          :current-month="selectedMonth"
          :current-year="selectedYear"
          @update:current-month="handleMonthUpdate"
          @update:current-year="handleYearUpdate"
        />


        <CalendarDesktop
          v-if="!smAndDown"
          :days-of-week="CALENDAR_DAYS"
          :calendar-days="calendarDays"
          :is-selected="isSelected"
          :is-today="isToday"
          :rotations-map="rotationsMap"
          @select-day="selectDay"
        />

        <!-- 
           <CalendarMobileSwipe v-else :daysOfWeek="CALENDAR_DAYS" :calendarDays="calendarDays" :isSelected="isSelected"
          :isWorkDay="isWorkDay" 
          :isToday="isToday" :rotationsMap="rotationsMap"
          :vacationsOfUser="vacationsOfUser" @select-day="selectDay"  /> -->
        <CalendarMobile
          v-else
          :days-of-week="CALENDAR_DAYS"
          :calendar-days="calendarDays"
          :is-selected="isSelected"
          
          :is-today="isToday"
          :rotations-map="rotationsMap"
          @select-day="selectDay"
          @swipe-left="handleSwipeLeft"
          @swipe-right="handleSwipeRight"
        />
      </v-col>

      <!-- Side Panel (Desktop) -->
    
      <CalendarSidePanel
        v-if="selectedDate && !mdAndDown"
        :cols="4"
        :formatted-date="formattedDate"
        :selected-date="selectedDate"
        @open-rempla-dialog="openRemplaDialog"
        @open-drawer="handleOpenDrawer"
        @cancel="handleCancel"
        @withdraw="handleWithdraw"
      />
 

      <!-- Bottom Sheet (Mobile) -->
      <CalendarBottomSheet
        v-if="mdAndDown"
        v-model="showBottomSheet"
        :formatted-date="formattedDate"
        :selected-date="selectedDate"
        @update:model-value="onBottomSheetClose"
        @open-rempla-dialog="openRemplaDialog" 
        @open-drawer="handleOpenDrawer"
        @cancel="handleCancel" 
        @withdraw="handleWithdraw"
      />
    </v-row>

    <AddSubstitutionForm
      :submitting="subInProgress"
      :dialog-mode="dialogMode"
      :dialog-visible="remplaDialog"
      :date="selectedDate"
      :selected-shift="selectedVacation"
      @on-close="closeRemplaDialog"
      @on-submit="handleSubmit"
      @update:dialog-mode-value="dialogMode = $event"
      @update:dialog-visible="remplaDialog = $event"
    />


    <v-dialog
      v-model="loadingVacations"
      persistent
      max-width="250"
    >
      <div class="pa-6 rounded-xl bg-surfaceContainer">
        <div class="d-flex align-center ga-4">
          <v-progress-circular
            size="24"
            indeterminate
            color="remplacement"
          />
          <span class="ml-4">Chargement...</span>
        </div>
      </div>
    </v-dialog>

    <!-- Drawers -->
    <UnifiedDrawer 
      v-model="activeDrawer.show" 
      :selected-date="selectedDate"
      :drawer-type="activeDrawer.type"
      @update:model-value="activeDrawer.show = false"
      @handle-replacement="handleReplacement"
      @handle-switch="handleSwitch"
      @open-details="openDemand"
    />

    <DemandDependencies ref="demandDeps" />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from "@/stores/authStore.js";
import { useDisplay } from "vuetify";
import { useUserStore } from '@/stores/userStore';
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { useShiftStore } from "@/stores/shiftStore.js";
import { useCalendar } from '@/composables/useCalendar';
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useRotationStore } from "@/stores/rotationStore.js";
import { useCalendarNavigation } from '@/composables/useCalendarNavigation';

/** Constantes */
const CALENDAR_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIALOG_MODES = {
  REMPLACEMENT: 'Rempla'
};



/**  Initialisation des stores */
const authStore = useAuthStore();
const substitutionStore = useSubstitutionStore();
const snackbarStore = useSnackbarStore();
// const userStore = useUserStore();
const shiftStore = useShiftStore();
const demandDeps = ref(null);
const rotationStore = useRotationStore();

/**  États */
const isLoading = ref(false);
const remplaDialog = ref(false);
const showBottomSheet = ref(false);
const dialogMode = ref(DIALOG_MODES.REMPLACEMENT);
const loadingVacations = ref(false);
const activeDrawer = ref({ show: false, type: 'substitutions' });
const subInProgress = ref(false);

const activeRotation = computed(() => {
  return rotationStore.sortedRotations.find(rotation => rotation.status === 'active') || null;
 
});


const { mobile, smAndDown, mdAndDown } = useDisplay();
const userId = computed(() => authStore.userData.userId);

// Utilisation des composables
const { 
  selectedDate,
  formattedDate,
  currentLocalDate,
  selectedMonth,
  selectedYear,
  handleMonthUpdate,
  handleYearUpdate,
  handleSwipeLeft,
  handleSwipeRight
} = useCalendarNavigation();

const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
}); 

const { calendarDays } = useCalendar(selectedYear, selectedMonth);
const rotationsMap = ref(new Map());

// Computed properties
const selectedVacation = computed(() => {
  if (!selectedDate.value) return null;
  return {shift : vacationsOfUser.value.get(selectedDate.value.split('T')[0])?.shift, teamObject : vacationsOfUser.value.get(selectedDate.value.split('T')[0])?.teamObject};
});

// const accepterName = computed(() => {
//   if (!substitutionToCancel.value?.accepterId) return '';
//   const accepter = userStore.users.find(u => u._id === substitutionToCancel.value.accepterId);
//   return accepter ? `${accepter.name} ${accepter.lastName}` : '';
// });

const isSelected = (date) => selectedDate.value === date.toISOString();

const isToday = (date) => {
  const today = currentLocalDate.value;
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};



// Handlers
const selectDay = (date) => {
  if (!date) return;
  selectedDate.value = date.toISOString();
};

const openRemplaDialog = (mode) => {
  dialogMode.value = mode;
  remplaDialog.value = true;
};

const handleOpenDrawer = (type) => {
  activeDrawer.value = { show: true, type };
};

const closeRemplaDialog = () => {
  remplaDialog.value = false;
};

const onBottomSheetClose = (isOpen) => {  
  if (!isOpen) {
    selectedDate.value = null;
  }
};


// Data fetching
const getWorkdaysOfUser = async () => {
  loadingVacations.value = true;
  try {
    const flatArray = calendarDays.value.flatMap(group => group.map(item => item.date));
    const dates = {
      startDate: flatArray[0].toISOString(),
      endDate: flatArray[flatArray.length - 1].toISOString()
    }
    await shiftStore.fetchShiftsWithSubstitutions(dates);
  } catch (err) {
    snackbarStore.showNotification(err.message, 'onError', 'mdi-alert-outline');
    throw err;
  } finally {
    loadingVacations.value = false;
  }
};

const fetchSubstitutions = async () => {
  if (!calendarDays.value || calendarDays.value.length === 0) {
    return;
  }

  try {
    const startDate = calendarDays.value[0][0].date.toISOString();
    const endDate = calendarDays.value[calendarDays.value.length - 1][6].date.toISOString();
    await substitutionStore.fetchAllDemands({startDate, endDate});
  } catch (err) {
    snackbarStore.showNotification('Erreur lors du chargement des substitutions : ' + err.message, 'onError', 'mdi-alert-outline');
    console.error('Erreur getAllSubstitutions:', err);
    throw err;
  }
};

const handleSubmit = async (demand) => {
    try {
      subInProgress.value = true;
      const posterId = userId.value;
      const posterShift = {
        date: demand.date,
        shift: demand.selectedShift.shift,
        teamId: demand.selectedShift.teamObject._id
      };

      const requestData = {
        posterId,
        posterShift,
        comment: demand.comment,
        points: demand.points,
        status: 'open',
        acceptedSwitches: demand.acceptedSwitches,
        isTrueSwitch: demand.isTrueSwitch
      };

      await substitutionStore.createSubstitutionDemand(requestData);
      snackbarStore.showNotification('Demande créée !', 'onPrimary', 'mdi-check');
      subInProgress.value = false;
      closeRemplaDialog();
      showBottomSheet.value = false
      return true;
    } catch (error) {
      console.error('Erreur lors de la création de la demande:', error);
      snackbarStore.showNotification('Erreur lors de la création de la demande : ' + error.message, 'onError', 'mdi-alert-circle-outline');
      closeRemplaDialog();
      showBottomSheet.value = false
      return false;
    }
  };


const handleCancel = (substitutionId) => {
  demandDeps.value.handleCancel(substitutionId);
};

const handleWithdraw = (substitutionId) => {
  demandDeps.value.handleWithdraw(substitutionId);
};

const handleReplacement = (demand) => {
  demandDeps.value.handleReplacement(demand);
};

const handleSwitch = (demand) => {
  demandDeps.value.handleSwitch(demand);
};

const openDemand = (demand) => {
  demandDeps.value.openDemandDetails(demand);
};

// Watchers
watch(selectedDate, (newDate) => {
  if (newDate && mobile.value) {
    showBottomSheet.value = true;
  }
}, { immediate: true });

watch(calendarDays, async (newCalendarDays) => {
  if (newCalendarDays && newCalendarDays.length > 0) {
    await Promise.all([
      getWorkdaysOfUser(),
      fetchSubstitutions()
    ]);
  }
});

// Lifecycle hooks
onMounted(async () => {
  try {
    isLoading.value = true;
    await Promise.all([
      getWorkdaysOfUser(),
      fetchSubstitutions()
    ]);
    // snackbarStore.showNotification('Substitutions et vacations chargées !', 'onPrimary', 'mdi-check');
  } catch (err) {
    snackbarStore.showNotification('Erreur lors du chargement initial', 'error', 'mdi-alert-outline');
    console.error('Erreur onMounted:', err);
  } finally {
    isLoading.value = false;
  }
});
</script>


<style>
:root {
  --calendar-day-size: 80px;
  --calendar-day-mobile-size: 48px;
  --border-radius: 8px;
}

.calendar-day {
  height: var(--calendar-day-size);
  width: var(--calendar-day-size);
}

.calendar-day-mobile {
  height: var(--calendar-day-mobile-size) !important;
  width: var(--calendar-day-mobile-size) !important;
}

.nblock {
  position: relative;
  /* Nécessaire pour positionner ::after */
  z-index: 0;
  /* Supprime le contexte inutile */
  overflow: visible !important;
  opacity: 1 !important;
}


.nblock:after {
  content: '';
  position: absolute;
  left: -2px;
  top: -2px;
  border-radius: 8px;
  background: linear-gradient(45deg, #ff86ac, rgba(255, 160, 109, 0.94), rgba(250, 152, 248, 0.05),
      rgba(159, 159, 248, 0.22), #f693b1);
  background-size: 400%;
  width: calc(100% + 4px);
  height: calc(100% + 4px);
  z-index: -1;
  /* Cela fonctionne si le stacking context de `.block` est supprimé */
  animation: steam 15s linear infinite;
}

@keyframes steam {
  0% {
    background-position: 0 0;
  }

  100% {
    background-position: 400% 0;
  }
}

.nblock:after {
  filter: blur(10px);
}


.empty-day {
  opacity: 0.5 !important;
}





</style>
