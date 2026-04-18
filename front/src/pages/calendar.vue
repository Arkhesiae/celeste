<template>
  <v-container>
    <v-row class="mt-16">
      <v-col cols="12" md="">
        <CalendarHeader :selected-month="selectedMonth" :selected-year="selectedYear" @navigate-month="navigateMonth" @go-to-today="goToToday" />

        <CalendarDesktop v-if="!smAndDown" :calendar-days="calendarDays" @update:selected-date="handleSelectDate" :selected-date="selectedDate" />

        <CalendarMobile v-else :calendar-days="calendarDays" :loading="loading" @update:selected-date="handleSelectDate"
          :selected-date="selectedDate" />
      </v-col>

      <v-col cols="auto" v-if="!mdAndDown" style="width: 400px !important; max-width: 400px !important;">
        <CalendarPanel v-if="selectedDate" :selected-date="selectedDate" @open-rempla-dialog="openSubstitutionForm"
          @open-drawer="handleOpenDrawer" @cancel="handleCancel" @withdraw="handleWithdraw" />
      </v-col>


      <v-bottom-sheet v-if="mdAndDown" :model-value="showBottomSheet" inset class="safe-area-bottom"
        @update:model-value="onBottomSheetClose">
        <CalendarPanel v-if="selectedDate" :selected-date="selectedDate" @open-rempla-dialog="openSubstitutionForm"
          @open-drawer="handleOpenDrawer" @cancel="handleCancel" @withdraw="handleWithdraw" />
      </v-bottom-sheet>
    </v-row>

    <SubstitutionForm :submitting="subInProgress" :dialog-mode="dialogMode" :dialog-visible="showSubstitutionForm"
      :date="selectedDate" :selected-shift="selectedVacation" @on-submit="handleSubmit"
      @update:dialog-visible="showSubstitutionForm = $event" />

    <!-- Drawers -->
    <UnifiedDrawer :model-value="showDrawer" :selected-date="selectedDate"
      @update:model-value="showDrawer = $event" @handle-replacement="handleReplacement"
      @handle-switch="handleSwitch" @open-details="openDemand" />

    <DemandDependencies ref="demandDeps" />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from "@/stores/authStore.js";
import { useDisplay } from "vuetify";
import { useSubstitutionStore } from "@/stores/substitutionStore.js";
import { useShiftStore } from "@/stores/shiftStore.js";
import { useCalendar } from '@/composables/useCalendar';
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useRotationStore } from "@/stores/rotationStore.js";
import { useCalendarNavigation } from '@/composables/useCalendarNavigation';
import { useCalendarData } from '@/composables/useCalendarData';
import SubstitutionForm from '@/components/Substitutions/SubstitutionForm.vue';
import Donations from '@/components/Donations.vue';

/** Constantes */
const DIALOG_MODES = {
  REMPLACEMENT: 'Rempla'
};



/**  Initialisation des stores */
const authStore = useAuthStore();
const substitutionStore = useSubstitutionStore();
const snackbarStore = useSnackbarStore();
const shiftStore = useShiftStore();
const demandDeps = ref(null);
const rotationStore = useRotationStore();

/**  États */
const selectedDate = ref(null);
const showSubstitutionForm = ref(false);
const showBottomSheet = ref(false);
const dialogMode = ref(DIALOG_MODES.REMPLACEMENT);
const showDrawer = ref(false);
const subInProgress = ref(false);

const activeRotation = computed(() => {
  return rotationStore.sortedRotations.find(rotation => rotation.status === 'active') || null;

});

const { mobile, smAndDown, mdAndDown } = useDisplay();

const {
  selectedMonth,
  selectedYear,
  navigateMonth,
  goToToday
} = useCalendarNavigation();

const { calendarDays } = useCalendar(selectedYear, selectedMonth);
const { loading, fetchMonthData } = useCalendarData(calendarDays);

// Utilisation des composables

const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
});



// Computed properties
const selectedVacation = computed(() => {
  if (!selectedDate.value) return null;
  const v = vacationsOfUser.value.get(selectedDate.value.split('T')[0]);
  return v ? { shift: v.shiftData?.shift, teamObject: v.shiftData?.team, selectedVariation: v.shiftData?.selectedVariation } : null;
});

const selectDay = (date) => {
  if (!date) return;
  selectedDate.value = date.toISOString();
};

const openSubstitutionForm = (mode) => {
  dialogMode.value = mode;
  showSubstitutionForm.value = true;
};

const handleOpenDrawer = (type) => {
  showDrawer.value = true;
};

const onBottomSheetClose = (isOpen) => {
  if (!isOpen) {
    showBottomSheet.value = false;
    selectedDate.value = null;
  }
};

const handleSelectDate = (dateStr) => {
  if (dateStr) {
    selectedDate.value = dateStr;
    showBottomSheet.value = true;
  } else {
    showBottomSheet.value = false;
    selectedDate.value = null;
  }
};


const handleSubmit = async (demand) => {
  try {
    subInProgress.value = true;
    const posterId = authStore.userData.userId;
    const posterShift = {
      date: demand.date,
      shift: demand.selectedShift.shift,
      teamId: demand.selectedShift.teamObject._id,
      selectedVariation: demand.selectedShift.selectedVariation || null
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
    showSubstitutionForm.value = false;
    showBottomSheet.value = false
    return true;
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    snackbarStore.showNotification('Erreur lors de la création de la demande : ' + error.message, 'onError', 'mdi-alert-circle-outline');
    showSubstitutionForm.value = false;
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



// Lifecycle hooks
onMounted(async () => {
  try {
    await fetchMonthData();
  } catch (err) {
    snackbarStore.showNotification('Erreur lors du chargement initial', 'error', 'mdi-alert-outline');
    console.error('Erreur onMounted:', err);
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
