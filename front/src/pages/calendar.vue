<template>
  <v-container>
    <v-row class="mt-4">
      <!-- Section Calendrier --> 

      <v-col cols="12" lg="8" class="mt-2">
        <CalendarHeader :currentMonth="selectedMonth" :currentYear="selectedYear"
          @update:currentMonth="handleMonthUpdate" @update:currentYear="handleYearUpdate"></CalendarHeader>


        <CalendarDesktop v-if="!smAndDown" :daysOfWeek="CALENDAR_DAYS" :calendarDays="calendarDays"
            :isSelected="isSelected" :isWorkDay="isWorkDay" :isToday="isToday" :vacationsOfUser="vacationsOfUser"
           :rotationsMap="rotationsMap" @select-day="selectDay" />


        <CalendarMobile v-else :daysOfWeek="CALENDAR_DAYS" :calendarDays="calendarDays" :isSelected="isSelected"
          :isWorkDay="isWorkDay" 
          :isToday="isToday" :rotationsMap="rotationsMap"
          :vacationsOfUser="vacationsOfUser" @select-day="selectDay" @swipe-left="handleSwipeLeft"
          @swipe-right="handleSwipeRight" />

      </v-col>

      <!-- Side Panel (Desktop) -->
    
      <CalendarSidePanel v-if="selectedDate && !mdAndDown":cols="4" :formattedDate="formattedDate"
        :vacationsOfUser="vacationsOfUser" :selectedDate="selectedDate"
        @openRemplaDialog="openRemplaDialog"
        @openDrawer="handleOpenDrawer"
        @cancelDemand="handleCancelDemand"
        @unacceptDemand="handleUnacceptDemand" />
 

      <!-- Bottom Sheet (Mobile) -->
      <CalendarBottomSheet v-if="mdAndDown" v-model="showBottomSheet" :formattedDate="formattedDate"
        :vacationsOfUser="vacationsOfUser" :selectedDate="selectedDate"
        @update:modelValue="onBottomSheetClose"
        @openRemplaDialog="openRemplaDialog" 
        @openDrawer="handleOpenDrawer"
        @cancelDemand="handleCancelDemand" 
        @unacceptDemand="handleUnacceptDemand" />
    </v-row>

    <AddSubstitutionForm :dialogMode="dialogMode" :dialogVisible="remplaDialog" :vacationsOfUser="vacationsOfUser"
      :date="selectedDate" :selectedVacation="selectedVacation" @onClose="closeRemplaDialog" @onSubmit="handleSubmit"
      @update:dialogModeValue="dialogMode = $event" @update:dialogVisible="remplaDialog = $event">
    </AddSubstitutionForm>



    <v-dialog v-model="loadingVacations" persistent width="300">
      <v-card rounded="xl" class="pa-2">
        <v-card-text class="d-flex align-center">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="ml-4">Chargement...</p>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Drawers -->
    <UnifiedDrawer 
      v-model="activeDrawer.show" 
      :selected-date="selectedDate"
      :drawer-type="activeDrawer.type"
      @update:model-value="activeDrawer.show = false"
    />

    <ConfirmationDialog
      :isDialogVisible="showCancelConfirmationDialog"
      :title="'Confirmer l\'annulation'"
      :text="`Cette demande a été acceptée par ${accepterName}. Êtes-vous sûr de vouloir l'annuler ?`"
      :icon="'mdi-alert-outline'"
      :iconColor="'error'"
      :confirmText="'Confirmer l\'annulation'"
      @confirm="confirmCancelDemand"
      @update:isDialogVisible="showCancelConfirmationDialog = $event"
    />

    <ConfirmationDialog
      :isDialogVisible="showUnacceptConfirmationDialog"
      :title="'Confirmer l\'annulation'"
      :text="'Êtes-vous sûr de vouloir annuler votre acceptation de ce remplacement ?'"
      :icon="'mdi-alert-outline'"
      :iconColor="'error'"
      :confirmText="'Confirmer l\'annulation'"
      @confirm="confirmUnacceptDemand"
      @update:isDialogVisible="showUnacceptConfirmationDialog = $event"
    />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from "@/stores/authStore.js";
import { useDisplay } from "vuetify";
import { useTeamStore } from "@/stores/teamStore.js";
import { useUserStore } from '@/stores/userStore';
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { useShiftStore } from "@/stores/shiftStore.js";
import { useCalendar } from '@/composables/useCalendar';
import { vacationService } from "@/services/vacationService.js";
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useRotationStore } from "@/stores/rotationStore.js";
import { useSubstitutionManagement } from '@/composables/useSubstitutionManagement';
import { useCalendarNavigation } from '@/composables/useCalendarNavigation';
import CalendarHeader from "@/components/Calendar/CalendarHeader.vue";
import CalendarDesktop from "@/components/Calendar/CalendarDesktop.vue";
import CalendarMobile from "@/components/Calendar/CalendarMobile.vue";

import AddSubstitutionForm from "@/components/Dialogs/AddSubstitutionForm.vue";
import UnifiedDrawer from "@/components/Calendar/Drawers/UnifiedDrawer.vue";
import ConfirmationDialog from "@/components/common/ConfirmationDialog.vue";

/** Constantes */
const CALENDAR_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIALOG_MODES = {
  REMPLACEMENT: 'Rempla'
};



/**  Initialisation des stores */
const authStore = useAuthStore();
const substitutionStore = useSubstitutionStore();
const snackbarStore = useSnackbarStore();
const teamStore = useTeamStore();
const userStore = useUserStore();
const shiftStore = useShiftStore();

/**  États */
const isLoading = ref(false);
const remplaDialog = ref(false);
const showBottomSheet = ref(false);
const dialogMode = ref(DIALOG_MODES.REMPLACEMENT);
const loadingVacations = ref(false);
const activeDrawer = ref({ show: false, type: 'substitutions' });
const showCancelConfirmationDialog = ref(false);
const showUnacceptConfirmationDialog = ref(false);
const substitutionToCancel = ref(null);
const substitutionToUnaccept = ref(null);

const shiftsWithSubstitutions = computed(() => {
  return shiftStore.shiftsWithSubstitutions;
});

const { mobile, smAndDown, mdAndDown } = useDisplay();
const userId = computed(() => authStore.userId);

// Utilisation des composables
const { 
  selectedDate,
  formattedDate,
  currentLocalDate,
  selectedMonth,
  selectedYear,
  handleMonthUpdate,
  handleYearUpdate,
  navigateMonth,
  handleSwipeLeft,
  handleSwipeRight
} = useCalendarNavigation();


const { calendarDays } = useCalendar(selectedYear, selectedMonth);
const rotationsMap = ref(new Map());

// Computed properties
const selectedVacation = computed(() => {
  if (!selectedDate.value) return null;
  return {shift : vacationsOfUser.value.get(selectedDate.value)?.shift?._id, teamObject : vacationsOfUser.value.get(selectedDate.value)?.teamObject};
});

const accepterName = computed(() => {
  if (!substitutionToCancel.value?.accepterId) return '';
  const accepter = userStore.users.find(u => u._id === substitutionToCancel.value.accepterId);
  return accepter ? `${accepter.name} ${accepter.lastName}` : '';
});

const isSelected = (date) => selectedDate.value === date.toISOString();

const isToday = (date) => {
  const today = currentLocalDate.value;
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
};

const isWorkDay = (date) => {
  const shift = vacationsOfUser.value.get(date.toISOString())?.shift;
  return shift ? shift.type !== 'rest' : false;
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

const getAllSubstitutions = async () => {
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
      const posterId = userId.value;
      const posterShift = {
        date: demand.date,
        shift: demand.selectedVacation.shift,
        teamId: demand.selectedVacation.teamObject._id
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

const handleCancelDemand = async (substitutionId) => {

  try {
    const substitution = substitutionStore.substitutions.find(s => s._id === substitutionId);
    if (substitution?.accepterId) {
      substitutionToCancel.value = substitution;
      showCancelConfirmationDialog.value = true;
      return;
    }
    
    await substitutionStore.cancelDemand(substitutionId);
    snackbarStore.showNotification('Demande annulée', 'onPrimary', 'mdi-check');
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'annulation de la demande : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const confirmCancelDemand = async () => {
  try {
    await substitutionStore.cancelDemand(substitutionToCancel.value._id);
    snackbarStore.showNotification('Demande annulée', 'onPrimary', 'mdi-check');
    showCancelConfirmationDialog.value = false;
    substitutionToCancel.value = null;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'annulation de la demande : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const handleUnacceptDemand = (substitutionId) => {
  substitutionToUnaccept.value = substitutionId;
  showUnacceptConfirmationDialog.value = true;
};

const confirmUnacceptDemand = async () => {
  try {
    await substitutionStore.unacceptDemand(substitutionToUnaccept.value);
    snackbarStore.showNotification('Acceptation annulée', 'onPrimary', 'mdi-check');
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'annulation de l\'acceptation', 'onError', 'mdi-alert-circle-outline');
  } finally {
    showUnacceptConfirmationDialog.value = false;
    substitutionToUnaccept.value = null;
  }
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
      getAllSubstitutions()
    ]);
  }
});

// Lifecycle hooks
onMounted(async () => {
  try {

    isLoading.value = true;
    await Promise.all([
      
    
      getWorkdaysOfUser(),
      getAllSubstitutions(),
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
