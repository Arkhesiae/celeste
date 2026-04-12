<template>
  <div class="shift-card  rounded-xl  pa-4 px-4 position-relative d-flex flex-column justify-space-between"
    :class="status === 'off' ? 'offDay' : ''">
    <div v-if="!isBaseShift" class="d-flex align-center ga-1 pa-0">
      <span class="text-h7 font-weight-medium text-disabled">{{ baseShift?.name }}</span>
      <div v-for="(entry, index) in history" :key="index" class="d-flex align-center ga-1">
        <v-icon size="x-small" icon="mdi-arrow-right-drop-circle-outline" color="primary" style="opacity: 0.8;" />
        <span v-if="entry.type === 'shift'" class="text-h7 font-weight-medium">
          {{ entry.shiftData?.shift?.name }}
        </span>
        <v-icon v-else :key="entry?.type" size="16" class="text-medium-emphasis">
          {{ typeIcon(entry?.type) }}
        </v-icon>
        <span v-if="entry.wasOverride" class="text-caption text-disabled">Override</span>
      </div>
    </div>

    <div v-if="canRegisterEntry" class="d-flex align-center ga-2" style="position: absolute; top: 12px; right: 12px;">
      <v-tooltip text="Modifier" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" icon size="small" variant="text" @click="emit('open-entry-dialog')">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip v-if="!isBaseShift" text="Annuler les modifications" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" icon size="small" variant="text" @click="restoreInitialShift">
            <v-icon>mdi-undo-variant</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <div class="d-flex align-center ga-4">
      <span v-if="isShift && !isRestDay" class="text-h4 font-weight-medium">
        {{ shiftName }}
      </span>

      <div v-else-if="isRestDay" class="pb-0 mb-0">
        <span class="text-h6 font-weight-medium">Repos</span>
      </div>

      <div v-else-if="!isShift">
        <span class="text-h7 font-weight-medium ">{{ dayType }}</span>
      </div>

      <div class="d-flex flex-column justify-space-between">
        <HourRange v-if="hours" :hours="hours" :endsNextDay="shiftEndsNextDay" />
        <div v-if="shiftTeam" class="py-0 text-caption opacity-70"
          style="margin-top: -5px; font-size: 11px !important;">
          Dans l'équipe {{ shiftTeam }}
        </div>
        <!-- <div v-if="comment" style="margin-top: -5px; font-size: 11px !important;">
          <span class="py-0 text-caption opacity-70">{{ comment }}</span>
        </div> -->
      </div>
    </div>

    <Transition name="fade-expand">
      <VariationSelector :is-rest-day="isRestDay" :in-past="inPast" :is-shift="isShift" :is-off="isOff"
        :has-no-demand="hasNoDemand" :status="status" :variations="variations" :selected-variation="selectedVariation"
        @register-mdda="registerMDDA" @patch-hours="patchHours" @select-variation="selectVariationForDay"
        @register-vic="registerVIC" @register-absence="registerAbsence" />
    </Transition>
  </div>
</template>

<script setup>
import { useShiftStore } from '@/stores/shiftStore';
import { useAuthStore } from '@/stores/authStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { planningModificationService } from '@/services/planningModificationService';
import { getEffectiveShiftTimes, getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { entryTypes } from '@/utils/entryIcons';

const props = defineProps({
  date: { type: [Date, String], required: true },
  canRegisterEntry: { type: Boolean, default: true },
});

const emit = defineEmits(['open-entry-dialog', 'entry-registered']);

const shiftStore = useShiftStore();
const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();
const substitutionStore = useSubstitutionStore();

// ─── Date key ─────────────────────────────────────────────────────────────────

const dateKey = computed(() => {
  if (!props.date) return null;
  const s = typeof props.date === 'string' ? props.date : props.date?.toISOString?.();
  return s?.slice(0, 10) ?? null;
});

// ─── Vacation data ────────────────────────────────────────────────────────────

const vacation = computed(() =>
  dateKey.value ? shiftStore.persistentVacationsMap.get(dateKey.value) : null
);

// ─── Derived state ────────────────────────────────────────────────────────────

const isRestDay = computed(() => vacation.value?.shiftData?.shift?.type === 'rest');
const isShift = computed(() => !!vacation.value?.shiftData?.shift);
const isOff = computed(() => vacation.value?.isOff);
const isBaseShift = computed(() => vacation.value?.isBaseShift);
const baseShift = computed(() => vacation.value?.baseShift);
const history = computed(() => vacation.value?.history);
const variations = computed(() => vacation.value?.shiftData?.shift?.variations ?? []);
const selectedVariation = computed(() => vacation.value?.shiftData?.selectedVariation);
const shiftTeam = computed(() => vacation.value?.shiftData?.team?.name || '');
const shiftName = computed(() => getDisplayShiftName(vacation.value));
const shiftEndsNextDay = computed(() => {
  const shift = vacation.value?.shiftData?.shift;
  const variation = vacation.value?.shiftData?.selectedVariation;
  return shift ? (getEffectiveShiftTimes(shift, variation)?.endsNextDay ?? false) : false;
});

const hours = computed(() => {
  if (vacation.value?.startTime && vacation.value?.endTime) {
    return { startTime: vacation.value.startTime, endTime: vacation.value.endTime };
  }
  return null;
});

const inPast = computed(() => {
  if (!dateKey.value) return false;
  return dateKey.value < new Date().toISOString().slice(0, 10);
});

const status = computed(() => {
  if (vacation.value?.shiftData?.selectedVariation === 'vic') return 'vic';
  if (vacation.value?.shiftData?.selectedVariation) return 'variation';
  return null;
});

const statusColor = computed(() => {
  switch (status.value) {
    case 'off': return 'error';
    case 'vic': return 'warning';
    default: return 'onBackground';
  }
});

const dayType = computed(() => {
  const type = vacation.value?.type;
  return entryTypes.find((e) => e.key === type)?.label ?? null;
});

const hasNoDemand = computed(() => {
  const acceptedAsAccepter = substitutionStore.acceptedAsAccepter.filter(d => d.posterShift.date === props.date);
  const acceptedAsPoster = substitutionStore.acceptedAsPoster.filter(d => d.posterShift.date === props.date);
  const pendingDemand = [
    ...substitutionStore.ownPendingHybridSubstitutions,
    ...substitutionStore.ownPendingTrueSubstitutions,
    ...substitutionStore.ownPendingTrueSwitches,
  ].find(d => d.posterShift.date === props.date);
  return !pendingDemand && !acceptedAsPoster?.length && !acceptedAsAccepter?.length;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const typeIcon = (type) => {
  const entry = entryTypes.find((e) => e.key === type);
  return entry ? 'mdi-' + entry.icon : 'mdi-close';
};

// ─── Actions ──────────────────────────────────────────────────────────────────

const registerEntry = async (payload) => {
  try {
    const res = await planningModificationService.registerEntry(payload);
    shiftStore.addEntry(res.userShift[0], dateKey.value);
    emit('entry-registered');
  } catch (error) {
    console.error(error);
  }
};

const restoreInitialShift = async () => {
  try {
    const res = await planningModificationService.restoreInitialShift(
      authStore.userData.userId,
      dateKey.value
    );
    shiftStore.addEntry(res.userShift[0], dateKey.value);
    emit('entry-registered');
  } catch (err) {
    snackbarStore.showNotification('Erreur : ' + err.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const selectVariationForDay = (variation) => registerEntry({
  type: 'modification',
  entryType: 'variation',
  date: dateKey.value,
  selectedVariation: variation?._id ?? null,
  shift: vacation.value?.shiftData?.shift?._id,
  centerId: authStore.userData?.centerId,
  confirmCreation: true,
});

const registerMDDA = () => registerEntry({
  type: 'hourPatch',
  date: dateKey.value,
  shift: vacation.value?.shiftData?.shift?._id,
  centerId: authStore.userData?.centerId,
  confirmCreation: true,
});

const patchHours = () => {
  // implement as needed
};

const registerAbsence = () => registerEntry({
  entryType: 'disp',
  type: 'modification',
  date: dateKey.value,
  cancel: isOff.value,
  comment: isOff.value ? 'Retour de congé' : 'Absence enregistrée',
  confirmCreation: true,
});

const registerVIC = () => registerEntry({
  entryType: 'vic',
  type: 'modification',
  date: dateKey.value,
  shift: vacation.value?.shiftData?.shift?._id,
  confirmCreation: true,
});
</script>

<style scoped>
.icon-container {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: rgba(var(--v-theme-primary), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shift-card {
  min-width: 300px !important;

}

.offDay {
  color: rgba(var(--v-theme-error), 0.8) !important;
}

.fade-expand-enter-active,
.fade-expand-leave-active {
  transition: all 0.3s ease;
}

.fade-expand-enter-from,
.fade-expand-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(1);
}
</style>