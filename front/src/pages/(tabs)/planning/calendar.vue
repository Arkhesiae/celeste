<template>
  <v-container>
    <v-row class="mt-16">
      <v-col cols="12" md="">
        <CalendarHeader
          :selected-month="selectedMonth"
          :selected-year="selectedYear"
          @navigate-month="onNavigateMonth"
          @go-to-today="goToToday"
        />

        <CalendarDesktop
          v-if="!smAndDown"
          :calendar-days="calendarDays"
          :selected-date="selectedDate"
          :period="period"
          @update:selected-date="handleSelectDate"
          @inspect-window="inspectWindow"
        />

        <CalendarMobile
          v-else
          ref="calendarMobile"
          :calendar-days="calendarDays"
          :previous-days="previousDays"
          :next-days="nextDays"
          :selected-date="selectedDate"
          :period="period"
          @update:selected-date="handleSelectDate"
          @move="navigateMonth"
          @inspect-window="inspectWindow"
        />

        <WorkLegend v-if="workCheckStore.limits" :limits="workCheckStore.limits" class="mt-4 px-2" />
      </v-col>

      <v-col v-if="!mdAndDown" cols="auto" style="width: 400px !important; max-width: 400px !important">
        <div class="d-flex flex-column ga-4">
          <CalendarPanel
            v-if="selectedDate"
            :selected-date="selectedDate"
            @open-rempla-dialog="openDemandForm"
            @open-drawer="handleOpenDrawer"
            @cancel="handleCancel"
            @withdraw="handleWithdraw"
          />

          <WorkWindowTile
            v-if="workCheckStore.limits"
            :active="windowMode"
            :window-start="windowStart"
            :windows="workCheckStore.windows"
            :days-by-date="workCheckStore.daysByDate"
            :limits="workCheckStore.limits"
            @update:active="setWindowMode"
            @update:window-start="windowStart = $event"
          />
        </div>
      </v-col>

      <v-bottom-sheet
        v-if="mdAndDown"
        :model-value="showBottomSheet"
        inset
        class="safe-area-bottom"
        @update:model-value="onBottomSheetClose"
      >
        <div class="d-flex flex-column ga-4">
          <CalendarPanel
            v-if="selectedDate && selectionMode === 'day'"
            :selected-date="selectedDate"
            @open-rempla-dialog="openDemandForm"
            @open-drawer="handleOpenDrawer"
            @cancel="handleCancel"
            @withdraw="handleWithdraw"
          />
          <WorkWindowTile
            v-if="windowStart && workCheckStore.limits && windowMode"
            headerless
            :window-start="windowStart"
            :windows="workCheckStore.windows"
            :days-by-date="workCheckStore.daysByDate"
            :limits="workCheckStore.limits"
            @update:window-start="windowStart = $event"
          />
        </div>
      </v-bottom-sheet>
    </v-row>

    <!-- Mobile : bouton flottant à deux états. Inactif : on choisit un jour normalement. Actif (mode « fenêtre ») : un jour
         touché ouvre sa fenêtre de 7 jours dans la feuille du bas ; un nouveau clic sur le bouton revient au mode normal.
         order 1 + layout : il se pose au-dessus de la barre de navigation du bas. -->
    <v-fab
      v-if="mdAndDown"
      app
      layout
      :order="1"
      location="bottom end"
      flat
      :extended="windowMode"
      text="Window"
      :rounded="windowMode ? '12' : '24'"
      elevation="0"
      :icon="windowMode ? 'mdi-calendar-remove-outline' : 'mdi-calendar-week-outline'"
      :color="windowMode ? 'error' : 'primary'"
      :aria-pressed="windowMode"
      :aria-label="windowMode ? 'Quitter le mode fenêtre de 7 jours' : 'Choisir une fenêtre de 7 jours'"
      @click="setWindowMode(!windowMode)"
    />

    <DemandForm
      :submitting="subInProgress"
      :dialog-mode="dialogMode"
      :dialog-visible="showDemandForm"
      :date="selectedDate"
      :selected-shift="selectedVacation"
      @on-submit="handleSubmit"
      @update:dialog-visible="showDemandForm = $event"
    />

    <!-- Drawers -->
    <UnifiedDrawer
      :model-value="showDrawer"
      :selected-date="selectedDate"
      @update:model-value="showDrawer = $event"
      @handle-replacement="handleReplacement"
      @handle-switch="handleSwitch"
      @open-details="openDemand"
    />

    <DemandDependencies ref="demandDeps" />
  </v-container>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '@/stores/authStore.js';
import { useDisplay } from 'vuetify';
import { useDemandStore } from '@/stores/demandStore.js';
import { useShiftStore } from '@/stores/shiftStore.js';
import { useCalendar } from '@/composables/useCalendar';
import { useSnackbarStore } from '@/stores/snackbarStore.js';
import { useCalendarNavigation } from '@/composables/useCalendarNavigation';
import { useCalendarData } from '@/composables/useCalendarData';
import { toDateKey } from '@/utils/dateKey';
import { Temporal } from 'temporal-polyfill';
import { useWorkCheckStore } from '@/stores/workCheckStore.js';

/** Constantes */
const DIALOG_MODES = {
  REMPLACEMENT: 'Rempla',
};

/**  Initialisation des stores */
const authStore = useAuthStore();
const demandStore = useDemandStore();
const snackbarStore = useSnackbarStore();
const shiftStore = useShiftStore();
const demandDeps = ref(null);

/**  États */
const selectedDate = ref(null);
// `day` = un jour à la fois ; `window` = mode « fenêtre de 7 jours » (mobile, bouton flottant)
const selectionMode = ref('day');
const period = ref(null); // fenêtre de 7 jours mise en évidence dans le calendrier : { start, end }
const windowStart = ref(null); // premier jour de la fenêtre de 7 jours affichée dans la tuile
const workCheckStore = useWorkCheckStore();
const showDemandForm = ref(false);
const showBottomSheet = ref(false);
const dialogMode = ref(DIALOG_MODES.REMPLACEMENT);
const showDrawer = ref(false);
const subInProgress = ref(false);

const { mobile, smAndDown, mdAndDown } = useDisplay();

const { selectedMonth, selectedYear, navigateMonth, goToToday } = useCalendarNavigation();

const { calendarDays, previousDays, nextDays } = useCalendar(selectedYear, selectedMonth);
// Sur mobile, les mois voisins sont chargés avec le mois affiché pour que le glissement les montre déjà remplis
const { fetchMonthData } = useCalendarData(
  calendarDays,
  computed(() => (smAndDown.value ? { previousDays: previousDays.value, nextDays: nextDays.value } : null)),
);

// Flèches du mois : sur mobile elles font glisser le calendrier, qui prévient ensuite la page (`move`)
const calendarMobile = ref(null);
const onNavigateMonth = (direction) => {
  if (smAndDown.value && calendarMobile.value) calendarMobile.value.slideBy(direction);
  else navigateMonth(direction);
};

// Utilisation des composables

const vacationsOfUser = computed(() => {
  return shiftStore.persistentVacationsMap;
});

// Computed properties
const selectedVacation = computed(() => {
  if (!selectedDate.value) return null;
  const v = vacationsOfUser.value.get(selectedDate.value.split('T')[0]);
  return v
    ? { shift: v.shiftData?.shift, teamObject: v.shiftData?.team, selectedVariation: v.shiftData?.selectedVariation }
    : null;
});

const selectDay = (date) => {
  if (!date) return;
  selectedDate.value = toDateKey(date);
};

const openDemandForm = (mode) => {
  dialogMode.value = mode;
  showDemandForm.value = true;
};

const handleOpenDrawer = (type) => {
  showDrawer.value = true;
};

const onBottomSheetClose = (isOpen) => {
  if (!isOpen) {
    showBottomSheet.value = false;
    selectedDate.value = null;
    // Mode fenêtre : fermer la feuille efface la fenêtre et ses informations, le mode reste actif pour le choix suivant
    if (windowMode.value) {
      period.value = null;
      windowStart.value = null;
    }
  }
};

const handleSelectDate = (dateStr) => {
  if (dateStr && windowMode.value) {
    selectWindowDay(dateStr);
    return;
  }
  if (dateStr) {
    selectedDate.value = dateStr;
    period.value = null; // la mise en évidence d'une fenêtre précédente n'a plus lieu d'être
    windowStart.value = dateStr; // la tuile de fenêtre part du jour choisi
    showBottomSheet.value = true;
  } else {
    showBottomSheet.value = false;
    selectedDate.value = null;
  }
};

// Mode « fenêtre de 7 jours » (mobile) : le jour touché est le premier d'une fenêtre de 7 jours, montrée dans la feuille du bas
const windowMode = computed(() => selectionMode.value === 'window');

const selectWindowDay = (dateStr) => {
  showWindowFrom(dateStr);
  if (mdAndDown.value) {
    selectedDate.value = null;
    showBottomSheet.value = true;
  } else {
    selectedDate.value = dateStr;
  }
};

// Entre dans le mode fenêtre (bouton flottant, ou en-tête de la tuile sur grand écran) ou en sort : le choix d'un jour redevient normal.
// Grand écran : la feuille du bas n'existe pas, le jour choisi et sa fenêtre de 7 jours s'affichent ensemble (les deux tuiles).
// Mobile et tablette : une seule chose à la fois dans la feuille, donc le choix précédent est effacé.
const setWindowMode = (on) => {
  selectionMode.value = on ? 'window' : 'day';
  showBottomSheet.value = false;
  if (mdAndDown.value) {
    period.value = null;
    windowStart.value = null;
    selectedDate.value = null;
  } else if (on && selectedDate.value) {
    showWindowFrom(selectedDate.value); // le jour déjà choisi ouvre sa fenêtre
  } else {
    period.value = null;
    windowStart.value = null;
  }
};

const showWindowFrom = (dateStr) => {
  period.value = { start: dateStr, end: Temporal.PlainDate.from(dateStr).add({ days: 6 }).toString() };
  windowStart.value = dateStr;
};

// Un clic sur une ligne du calendrier : on regarde cette fenêtre de 7 jours dans la tuile
const inspectWindow = (start) => {
  selectionMode.value = 'window'; // la tuile de fenêtre ne s'affiche que dans ce mode
  showWindowFrom(start);
  if (mdAndDown.value) {
    selectedDate.value = null;
    showBottomSheet.value = true;
  }
};

const handleSubmit = async (demand) => {
  try {
    subInProgress.value = true;
    const posterShift = {
      date: demand.date,
      shift: demand.selectedShift.shift,
      teamId: demand.selectedShift.teamObject._id,
      selectedVariation: demand.selectedShift.selectedVariation || null,
    };

    const requestData = {
      posterShift,
      comment: demand.comment,
      points: demand.points,
      acceptedSwitches: demand.acceptedSwitches,
      isTrueSwitch: demand.isTrueSwitch,
    };

    await demandStore.createDemand(requestData);
    snackbarStore.showNotification('Demande créée !', 'onPrimary', 'mdi-check');
    subInProgress.value = false;
    showDemandForm.value = false;
    showBottomSheet.value = false;
    return true;
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    snackbarStore.showNotification(
      'Erreur lors de la création de la demande : ' + error.message,
      'onError',
      'mdi-alert-circle-outline',
    );
    showDemandForm.value = false;
    showBottomSheet.value = false;
    return false;
  }
};

const handleCancel = (demandId) => {
  demandDeps.value.handleCancel(demandId);
};

const handleWithdraw = (demandId) => {
  demandDeps.value.handleWithdraw(demandId);
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
watch(
  selectedDate,
  (newDate) => {
    if (newDate && mobile.value) {
      showBottomSheet.value = true;
    }
  },
  { immediate: true },
);

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
  --border-radius: 8px;
}

.calendar-day {
  height: var(--calendar-day-size);
  width: var(--calendar-day-size);
}

.empty-day {
  opacity: 0.5 !important;
}
</style>
