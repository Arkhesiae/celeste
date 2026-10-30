<template>
  <div ref="calendarCard" class="mb-10">
    <CalendarHeader :selected-month="selectedMonth" :selected-year="selectedYear" @navigate-month="navigateMonth"
      @go-to-today="goToToday" />

    <CalendarMobile :calendar-days="calendarDays" :loading="loading" :selected-date="selectedDate"
      @update:selected-date="handleSelectDate" />
  </div>

  <v-bottom-sheet :model-value="showBottomSheet" inset scrim="true" class="safe-area-bottom"
    @update:model-value="onBottomSheetClose">
    <CalendarPanel v-if="selectedDate" :selected-date="selectedDate" @open-rempla-dialog="openSubstitutionForm"
      @open-drawer="handleOpenDrawer" @cancel="handleCancel" @withdraw="handleWithdraw" />
  </v-bottom-sheet>

  <SubstitutionForm :submitting="subInProgress" :dialog-mode="dialogMode" :dialog-visible="showSubstitutionForm"
    :date="selectedDate" :selected-shift="selectedVacation" @on-submit="handleSubmit"
    @update:dialog-visible="showSubstitutionForm = $event" />

  <!-- Drawers -->
  <UnifiedDrawer :model-value="showDrawer" :selected-date="selectedDate" @update:model-value="showDrawer = $event"
    @handle-replacement="handleReplacement" @handle-switch="handleSwitch" @open-details="openDemand" />


</template>

<script setup>
import { useCalendar } from '@/composables/useCalendar';
import { useCalendarNavigation } from '@/composables/useCalendarNavigation';
import { useCalendarData } from '@/composables/useCalendarData';
import { useShiftStore } from '@/stores/shiftStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useAuthStore } from '@/stores/authStore';
import { toDateKey } from '@/utils/dateKey';

const DIALOG_MODES = {
  REMPLACEMENT: 'replacement',
  SWITCH: 'switch',
};

const emit = defineEmits(['open-demand']);

const authStore = useAuthStore();
const subInProgress = ref(false);

const dialogMode = ref(DIALOG_MODES.REMPLACEMENT);
const showBottomSheet = ref(false);
const showDrawer = ref(false);
const selectedDate = ref(null);
const showSubstitutionForm = ref(false);

const shiftStore = useShiftStore();
const substitutionStore = useSubstitutionStore();
const snackbarStore = useSnackbarStore();


const {
  selectedMonth,
  selectedYear,
  navigateMonth,
  goToToday,
} = useCalendarNavigation();

const { calendarDays } = useCalendar(selectedYear, selectedMonth);
const { loading, fetchMonthData } = useCalendarData(calendarDays);

const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
});

const selectedVacation = computed(() => {
  if (!selectedDate.value) return null;

  const v = vacationsOfUser.value.get(selectedDate.value.toString());
  return v ? { shift: v.shiftData?.shift, teamObject: v.shiftData?.team, selectedVariation: v.shiftData?.selectedVariation } : null;
});

const onBottomSheetClose = (isOpen) => {
  if (!isOpen) {
    showBottomSheet.value = false;
    selectedDate.value = null;
  }
};

const handleSelectDate = (dateStr) => {
  if (dateStr) {
    selectedDate.value = toDateKey(dateStr) ?? dateStr;
    showBottomSheet.value = true;
  } else {
    showBottomSheet.value = false;
    selectedDate.value = null;
  }
};

const handleCancel = (substitutionId) => {
  demandDeps.value.handleCancel(substitutionId);
};

const handleWithdraw = (substitutionId) => {
  demandDeps.value.handleWithdraw(substitutionId);
};

const openSubstitutionForm = (mode) => {
  dialogMode.value = mode;
  showSubstitutionForm.value = true;
};

const closeRemplaDialog = () => {
  showSubstitutionForm.value = false;
  dialogMode.value = null;
};

const handleReplacement = () => {
  showDrawer.value = false;
  showSubstitutionForm.value = true;
};

const handleSwitch = () => {
  showDrawer.value = false;
  showSubstitutionForm.value = true;
};

const openDemand = (demandId) => {
  emit('open-demand', demandId);
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

    };

    await substitutionStore.createSubstitutionDemand(requestData);
    snackbarStore.showNotification('Demande créée !', 'onPrimary', 'mdi-check');
    subInProgress.value = false;
    closeRemplaDialog();
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    snackbarStore.showNotification('Erreur lors de la création de la demande', 'onError', 'mdi-alert-circle');
    subInProgress.value = false;
  }
};

const handleOpenDrawer = (type) => {
  showDrawer.value = true;
};


onMounted(async () => {
  if (calendarDays.value && calendarDays.value.length > 0) {
    await fetchMonthData();
  }
});



</script>

<style scoped>
.v-card-dashboard {
  background: rgba(var(--v-theme-background), 0.4);
}

.calendar-card.not-visible {
  opacity: 0.01;
  transition: all 0.3s ease-in-out;
  transform: translateY(20px) scale(0.90);
}

.calendar-card {
  opacity: 1;
  transition: all 0.5s ease-in-out .2s;
  transform: translateY(0px) scale(1);
}
</style>
