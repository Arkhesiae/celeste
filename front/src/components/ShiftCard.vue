<template>
  <div class="shift-card  rounded-xl  pa-4 px-4 position-relative d-flex flex-column justify-space-between"
    :class="status === 'off' ? 'offDay' : ''">
   
    <div  class="d-flex justify-space-between align-start">
      <div class="d-flex flex-column ga-2"> 

         <div v-if="!isBaseShift" class="d-flex align-center ga-1 pa-0">
      <span class="text-body-large font-weight-medium text-disabled">{{ baseShift?.name }}</span>
      <div v-for="(entry, index) in history" :key="index" class="d-flex align-center ga-1">
        <v-icon size="x-small" icon="mdi-arrow-right-drop-circle-outline" color="primary" style="opacity: 0.8;" />
        <span v-if="['shift', 'substitution'].includes(entry.type)" class="text-body-large font-weight-medium"
          :class="index === history.length - 1 ? '' : 'text-disabled'">
          {{ entry.shiftData?.shift?.name }}
        </span>
        <v-icon v-else :key="entry?.type" size="16" :class="index === history.length - 1 ? '' : 'text-disabled'">
          {{ typeIcon(entry?.type) }}
        </v-icon>
        <span v-if="entry.wasOverride" class="text-body-small text-disabled">Override</span>
      </div>
    </div>

    <div v-if="vacation.type === 'empty'">
      <span class="text-disabled">C'est vide</span>  </div>
    <div v-else class="d-flex align-center ga-4">
      <span v-if="isShift && !isRestDay" class="text-headline-large font-weight-medium">
        {{ shiftName }}
      </span>

      <div v-else-if="isRestDay" class="pb-0 mb-0">
        <span class="text-title-large font-weight-medium">Repos</span>
      </div>

      <div v-else-if="!isShift">
        <span class="text-body-large font-weight-medium ">{{ dayType }}</span>
      </div>

      <div class="d-flex flex-column justify-space-between">
        <HourRange v-if="hours" :hours="hours" :ends-next-day="shiftEndsNextDay" :was-patched="wasPatched" />
        <div v-if="shiftTeam" class="py-0 text-body-small opacity-70"
          style="line-height: 1.2; font-size: 11px !important;">
          Dans l'équipe {{ shiftTeam }}
        </div>
        <!-- <div v-if="comment" style="margin-top: -5px; font-size: 11px !important;">
          <span class="py-0 text-body-small opacity-70">{{ comment }}</span>
        </div> -->
      </div>
    </div>

      </div>
        

       <div v-if="enableAssign || showUndoMods || showDelete" class="d-flex align-center ga-2 mr-n2 mt-n2">
      <v-tooltip v-if="enableAssign && canRegisterEntry" text="Modifier" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" icon size="small" variant="text" @click="emit('open-entry-dialog')">
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip v-if="showUndoMods" text="Annuler les modifications" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" icon size="small" variant="text" @click="undoMods">
            <v-icon>mdi-undo-variant</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
      <v-tooltip v-if="showDelete" text="Supprimer l'entrée" location="top">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" icon size="small" variant="text" @click="deleteAssignment">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
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
  enableModifications: { type: Boolean, default: true },
  enableAssign: { type: Boolean, default: true },
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

console.log(vacation.value)

// ─── Derived state ────────────────────────────────────────────────────────────

const isRestDay = computed(() => vacation.value?.shiftData?.shift?.type === 'rest');
const isShift = computed(() => !!vacation.value?.shiftData?.shift);
const wasPatched = computed(() => vacation.value?.wasPatched);
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

const canRegisterEntry = computed(() => {
  const lastEntry = history.value?.[history.value?.length - 1];
  if (lastEntry && lastEntry.type === 'substitution') return false;
  return true;
});

const showUndoMods = computed(() => {
  return vacation.value?.shiftData?.selectedVariation;
});

const showDelete = computed(() => {
  const lastEntry = history?.value?.[history.value?.length - 1];
  if (lastEntry && lastEntry.type !== 'substitution') return true;
  return false
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



const deleteAssignment = async () => {
  try {
    const res = await planningModificationService.deleteAssignment(
      authStore.userData.userId,
      dateKey.value
    );
    shiftStore.addEntry(res.userShift[0], dateKey.value);
  } catch (err) {
    console.error(err);
    snackbarStore.showNotification(err.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const undoMods = async () => {
  try {
    const res = await planningModificationService.undoMods(
      authStore.userData.userId,
      dateKey.value
    );
    shiftStore.addEntry(res.userShift[0], dateKey.value);
  } catch (err) {
    console.error(err);
    snackbarStore.showNotification('Erreur : ' + err.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const ENTRY_SERVICE_MAP = {
  modification: 'registerModification',
  assignment: 'registerAssignement',
  hourPatch: 'registerHourPatch',
};

const basePayload = () => ({
  type: 'modification',
  date: dateKey.value,
  shiftId: vacation.value?.shiftData?.shift?._id,
  teamId: vacation.value?.shiftData?.team?._id,
  confirmCreation: true,
});

const selectVariationForDay = (variation) => registerEntry({
  ...basePayload(),
  entryType: 'variation',
  selectedVariation: variation?._id ?? null,
});

const registerAbsence = () => registerEntry({
  ...basePayload(),
  entryType: isOff.value ? 'pres' : 'disp',
});

const registerVIC = () => registerEntry({
  ...basePayload(),
  entryType: 'vic',
});

const registerEntry = async (payload) => {
  const method = ENTRY_SERVICE_MAP[payload.type];
  if (!method) throw new Error('Invalid payload type');
  try {
    const res = await planningModificationService.registerEntry(payload);
    console.log(res);
    shiftStore.addEntry(res.userShift[0], dateKey.value);
  } catch (error) {
    console.error(error);
    snackbarStore.showNotification('Erreur : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const registerMDDA = () => registerEntry({
  type: 'hourPatch',
  date: dateKey.value,
  shiftId: vacation.value?.shiftData?.shift?._id,
  centerId: authStore.userData?.centerId,
  confirmCreation: true,
});

const patchHours = () => {
  // implement as needed
};



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