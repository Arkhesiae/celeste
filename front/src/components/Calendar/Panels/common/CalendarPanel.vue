<template>
  <v-sheet :rounded="rounded" :elevation="elevation" class="py-4 px-4 position-relative safe-area-bottom"
    color="surfaceContainer">
    <div class="d-flex align-center justify-end mb-4 mx-2">
      <span class="text-body-2 font-weight-bold">{{ formattedDate }}</span>
    </div>

    <div class="mt-4 mb-4 rounded-xl bg-background pa-4 px-4 position-relative d-flex flex-column"
      :class="getVacation?.isOff ? 'offDay' : ''">
      <div class="d-flex pl-2">
        <v-scroll-x-transition mode="out-in">
          <v-icon v-if="getVacation?.isOff" size="20" color="surfaceContainerHigh">
            mdi-bag-carry-on-off
          </v-icon>
          <v-icon v-else-if="isRestDay" size="20" color="surfaceContainerHigh">
            mdi-sleep
          </v-icon>
          <v-icon v-else size="20" color="surfaceContainerHigh">
            mdi-airport
          </v-icon>
        </v-scroll-x-transition>
      </div>

      <v-tooltip text="Modifier" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" icon class="position-absolute" style="top: 12px; right: 12px;" size="small" variant="text">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <div class="d-flex align-center pl-2 ga-3">
        <div class="pb-0 mb-0">
          <span v-if="isRestDay" class="text-h6 font-weight-medium">Repos</span>
          <span v-else class="text-h3 font-weight-medium" style="position: relative; top: 2px;">{{ getShiftName }}</span>
        </div>
        <div class="d-flex align-start flex-column justify-space-between">
          <div v-if="!isRestDay">
            <span class="text-caption font-weight-bold">{{ getShiftHours.startTime }} - {{ getShiftHours.endTime }}</span>
            <span v-if="getShiftEndsNextDay" class="text-caption font-weight-bold opacity-50 ml-1"
              style="font-size: 10px !important; top: -2px; position: relative;">+1</span>
          </div>
          <div v-if="!isRestDay && getShiftTeam" class="py-0 text-caption opacity-70"
            style="margin-top: -8px; font-size: 11px !important;">
            Dans l'équipe {{ getShiftTeam }}
          </div>
        </div>
      </div>

      <!-- Sélecteur de vacation élémentaire -->
      <div v-if="!isRestDay && !inPast" class="mt-4 d-flex align-center justify-space-between align-self-end">
        <div class="d-flex align-center ga-2 chips-container">
          <div class="d-flex align-center chips-container-alt">
            <v-tooltip v-for="v in variations" :key="v._id" :text="v.startTime + ' - ' + v.endTime" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn v-bind="tooltipProps" icon size="small" variant="flat"
                  :color="isVariationSelected(v) ? 'primary' : 'surfaceContainerHigh'" @click="selectVariationForDay(v)"
                  :class="isVariationSelected(v) ? 'selected' : ''">
                  {{ v.name }}
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip :text="getVacation?.isOff ? 'Annuler l\'absence' : 'Déclarer une absence'" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn v-bind="tooltipProps" :disabled="!hasNoDemand" :color="getVacation?.isOff ? 'error' : 'surfaceContainerHigh'" icon
                  rounded="lg" size="small" flat @click="registerAbsence" :class="getVacation?.isOff ? 'selected' : ''">
                  <v-icon>mdi-cancel</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
          <v-scale-transition>
            <div v-if="hasCustomEntry">
              <v-tooltip text="Réinitialiser" location="top">
                <template #activator="{ props: tooltipProps }">
                  <v-btn v-bind="tooltipProps" color="transparent" flat @click="selectVariationForDay(null)" size="small" icon>
                    <v-icon>mdi-refresh</v-icon>
                  </v-btn>
                </template>
              </v-tooltip>
            </div>
          </v-scale-transition>
        </div>
      </div>

      <div class="d-flex flex-column align-end justify-end position-absolute"
        style="top: -38px; left: 0px;">
        <ConfirmationChipExtended v-if="substitutionStore.hasAcceptedAsPoster(selectedDateIso)"
          :date="new Date(selectedDate)" />
        <PendingChipExtended v-if="substitutionStore.hasOwnPendingDemand(selectedDateIso)"
          :date="new Date(selectedDate)" />
        <AccepterChipExtended v-if="substitutionStore.hasAcceptedAsAccepter(selectedDateIso)"
          :date="new Date(selectedDate)" />
      </div>
    </div>

    <div
      v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)"
      class="d-flex justify-end ga-2 mt-4 position-relative">
      <v-slide-y-transition>
        <div v-if="isRestDay || isOff" class="text-error" style="position: absolute; top: 32px;">
          <span style="font-size: 10px !important; opacity: 0.6;">Impossible si absent ou repos</span>
        </div>
      </v-slide-y-transition>
      <v-tooltip text="Proposer un échange" location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" height="36" color="surfaceContainerHighest"
            style="border-radius: 12px !important;" max-width="50" width="50" size="" :slim="true"
            :disabled="isRestDay || inPast || isOff"
            :class="{ 'opacity-10': isRestDay || inPast || isOff }" flat
            @click="$emit('openRemplaDialog', 'switch')">
            <v-icon>mdi-swap-horizontal-hidden</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip text="Demander un remplacement"  location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" height="36px" color="primary"
            :disabled="isRestDay || inPast || isOff" flat rounded="xl"
            :class="{ 'opacity-10': isRestDay || inPast || isOff }"
            @click="$emit('openRemplaDialog', 'substitution')">
            <v-icon>mdi-account-arrow-left-outline</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <div v-if="pendingDemand || acceptedAsPoster" class="d-flex align-center justify-center mb-4 mx-4">
      <v-btn color="error" height="48px" variant="tonal" :disabled="inPast || isOff"
        class="flex-grow-1 d-flex flex-column rounded-xl text-none" @click="$emit('cancel', substitutionId)">
        Annuler ma demande
      </v-btn>
    </div>

    <div v-if="acceptedAsAccepter" class="d-flex align-center justify-center mb-4 mx-4">
      <v-btn color="error" height="48px" variant="tonal" :disabled="inPast"
        class="flex-1-1 d-flex flex-column rounded-xl text-none" rounded="lg"
        @click="emit('withdraw', acceptedAsAccepter)">
        Se désister
      </v-btn>
    </div>

    <div class="d-flex ga-1 mb-2">
      <v-tooltip text="Remplacements disponibles" location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="category-indicator">
            <v-icon icon="mdi-account-arrow-left-outline" size="small" color="primary" />
            {{ availableSubstitutions.length }}
          </div>
        </template>
      </v-tooltip>
      <v-tooltip text="Échanges disponibles" location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="category-indicator">
            <v-icon icon="mdi-swap-horizontal" size="small" color="primary" />
            {{ availableSwitches.length }}
          </div>
        </template>
      </v-tooltip>
      <v-tooltip text="Autres demandes" location="top">
        <template #activator="{ props: tooltipProps }">
          <div v-bind="tooltipProps" class="category-indicator">
            <v-icon icon="mdi-close" size="small" color="error" />
            {{ otherDemands.length }}
          </div>
        </template>
      </v-tooltip>
    </div>

    <v-btn
      :class="{ 'opacity-10': availableSubstitutions.length === 0 && availableSwitches.length === 0 && otherDemands.length === 0 }"
      :disabled="availableSubstitutions.length === 0 && availableSwitches.length === 0 && otherDemands.length === 0"
      width="100%" flat rounded="xl" height="64px" color="background" append-icon="mdi-chevron-right"
      class="justify-space-between d-flex align-center text-subtitle-2" @click="$emit('openDrawer', 'substitutions')">
      <span v-if="availableSubstitutions.length > 0 || availableSwitches.length > 0 || otherDemands.length > 0">
        Voir les demandes disponibles
      </span>
      <span v-else>
        Aucune demande disponible
      </span>
    </v-btn>
  </v-sheet>
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useAuthStore } from '@/stores/authStore';
import { planningModificationService } from '@/services/planningModificationService';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { getEffectiveShiftTimes, getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';

const substitutionStore = useSubstitutionStore();
const snackbarStore = useSnackbarStore();
const authStore = useAuthStore();
const shiftStore = useShiftStore();

const props = defineProps({
  formattedDate: {
    type: String,
    required: true
  },
  selectedDate: {
    type: [Date, String, null],
    required: true
  },
  rounded: {
    type: String,
    default: 'xl'
  },
  elevation: {
    type: Number,
    default: 0
  },
  showChips: {
    type: Boolean,
    default: false
  },
});

const emit = defineEmits(['openRemplaDialog', 'openDrawer', 'cancel', 'openAbsenceDialog', 'withdraw']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateKey = (d) => {
  if (!d) return null;
  const s = typeof d === 'string' ? d : d?.toISOString?.();
  return s?.slice(0, 10) ?? null;
};

// ─── Core computeds ───────────────────────────────────────────────────────────

const getVacation = computed(() => {
  if (!props.selectedDate) return null;
  return shiftStore.persistentVacationsMap.get(toDateKey(props.selectedDate));
});

/** ISO string of selectedDate — avoids repeated `new Date(...).toISOString()` calls in the template */
const selectedDateIso = computed(() => new Date(props.selectedDate).toISOString());

const isRestDay = computed(() => getVacation.value?.shift?.type === 'rest');

const isOff = computed(() => getVacation.value?.isOff);

const inPast = computed(() =>
  toDateKey(props.selectedDate) < toDateKey(new Date())
);

// ─── Shift display ────────────────────────────────────────────────────────────

const getShiftName = computed(() => getDisplayShiftName(getVacation.value));

const getShiftHours = computed(() => {
  const shift = isOff.value ? getVacation.value?.initialShift : getVacation.value?.shift;
  const selectedVariation = getVacation.value?.selectedVariation;
  const effective = shift ? getEffectiveShiftTimes(shift, selectedVariation) : null;
  return effective
    ? { startTime: effective.startTime, endTime: effective.endTime }
    : { startTime: '', endTime: '' };
});

const getShiftEndsNextDay = computed(() => {
  const shift = getVacation.value?.shift;
  const selectedVariation = getVacation.value?.selectedVariation;
  const effective = shift ? getEffectiveShiftTimes(shift, selectedVariation) : null;
  return effective?.endsNextDay ?? false;
});

const getShiftTeam = computed(() => getVacation.value?.teamObject?.name || '');

// ─── Variations ───────────────────────────────────────────────────────────────

const variations = computed(() => {
  if (!getVacation.value) return [];
  return getVacation.value.shift?.variations ?? getVacation.value.initialShift?.variations ?? [];
});

const isVariationSelected = (variation) => {
  const current = getVacation.value?.selectedVariation;
  if (!current || !variation) return false;
  return (current._id || current)?.toString?.() === (variation._id || variation)?.toString?.();
};

const hasCustomEntry = computed(() => {
  return getVacation.value?.selectedVariation !== null || isOff.value;
});

const selectVariationForDay = async (variation) => {
  const dateKey = toDateKey(props.selectedDate);
  if (!dateKey) return;
  try {
    const data = await planningModificationService.registerModification({
      type: 'selectedVariation',
      date: dateKey,
      selectedVariation: variation ? variation._id : null,
      shift: getVacation.value?.shift?._id,
      centerId: authStore.userData?.centerId
    });
    if (data?.userShift?.[0]) {
      shiftStore.addEntry(data.userShift[0], toDateKey(data.userShift[0].date));
    }
    if (data?.updatedDemand) {
      substitutionStore.updateDemandInStore(data.updatedDemand);
    }
    substitutionStore.recategorizeSubstitutions(dateKey);
  } catch (err) {
    snackbarStore.showNotification('Erreur : ' + err.message, 'onError', 'mdi-alert-circle-outline');
  }
};

// ─── Absence ──────────────────────────────────────────────────────────────────

const registerAbsence = async () => {
  try {
    const isCurrentlyOff = getVacation.value?.isOff;
    const data = await planningModificationService.registerModification({
      type: 'absence',
      date: toDateKey(props.selectedDate),
      isOff: !isCurrentlyOff,
      comment: isCurrentlyOff ? 'Retour de congé' : 'Absence enregistrée'
    });
    shiftStore.addEntry(data.userShift[0], data.userShift[0].date);
    substitutionStore.recategorizeSubstitutions(data.userShift[0].date);
    snackbarStore.showNotification(
      isCurrentlyOff ? 'Absence annulée' : 'Absence enregistrée',
      'onPrimary', 'mdi-check'
    );
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'absence:', error);
    snackbarStore.showNotification(
      'Erreur lors de l\'enregistrement de l\'absence : ' + error.message,
      'onError', 'mdi-alert-circle-outline'
    );
  }
};

// ─── Substitution state ───────────────────────────────────────────────────────

const pendingDemand = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
].find(d => d.posterShift.date === props.selectedDate));

const acceptedAsAccepter = computed(() => {
  if (!props.selectedDate) return null;
  return substitutionStore.acceptedAsAccepter.find(d => d.posterShift.date === props.selectedDate);
});

const acceptedAsPoster = computed(() => {
  if (!props.selectedDate) return null;
  return substitutionStore.acceptedAsPoster.find(d => d.posterShift.date === props.selectedDate);
});

const substitutionId = computed(() => pendingDemand.value ?? acceptedAsPoster.value);

const hasNoDemand = computed(() =>
  !pendingDemand.value && !acceptedAsPoster.value && !acceptedAsAccepter.value
);

const availableSubstitutions = computed(() =>
  substitutionStore.availableSubstitutions.filter(d => d.posterShift.date === props.selectedDate)
);

const availableSwitches = computed(() =>
  substitutionStore.availableSwitches.filter(d => d.posterShift.date === props.selectedDate)
);

const otherDemands = computed(() =>
  substitutionStore.otherDemands.filter(d => d.posterShift.date === props.selectedDate)
);
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 24px) !important;
}

.offDay {
  color: rgba(var(--v-theme-error), 0.8) !important;
}

.chips-container {
  transition: all 0.5s ease-in-out;
  border-radius: 24px !important;
  padding: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chips-container::-webkit-scrollbar {
  display: none;
}

.chips-container-alt {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  overflow-y: hidden;
  transition: all 0.5s ease-in-out;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chips-container-alt::-webkit-scrollbar {
  display: none;
}

.chips-container-alt .v-btn {
  border-radius: 8px !important;
  transition: border-radius var(--motion-expressive-fast-spatial),
              background-color var(--motion-expressive-fast-effects);
}

.chips-container-alt .v-btn:first-child {
  border-radius: 24px 8px 8px 24px !important;
}

.chips-container-alt .v-btn:nth-child(2) {
  border-radius: 8px !important;
}

.chips-container-alt .v-btn:last-child {
  border-radius: 8px 24px 24px 8px !important;
}

.chips-container-alt .v-btn.selected {
  border-radius: 24px !important;
}

.chips-container-alt .v-btn:last-child.selected {
  border-radius: 8px !important;
}

.category-indicator {
  padding: 0 2px;
  height: 16px;
  border-radius: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
</style>
