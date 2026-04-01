<template>
  <v-sheet :rounded="rounded" :elevation="elevation" class="py-4 px-4 position-relative safe-area-bottom"
    color="surfaceContainer">



    <div class="d-flex align-center justify-space-between mb-4 mr-2 ga-2">
      <div class="d-flex align-center ga-1">
        <div v-for="(entry, index) in substitutionsDemands" :key="index" class="position-relative">
          <v-menu min-width="200" offset="10">
            <template #activator="{ props }">
              <v-btn v-bind="props" color="primary" icon size="x-small" :variant="entry.status === 'open' ? 'tonal' : 'flat'">
                <v-icon> {{ getDemandIcon(entry, authStore.userData.userId) }}</v-icon>
              </v-btn>
            </template>

            <v-list  rounded="xl" class="pa-2">
              <v-list-subheader>Je remplace dans ...</v-list-subheader>

              <v-list-item  title="Détails"  />

              <v-divider />

              <v-list-item prepend-icon="mdi-close-circle-outline" title="Annuler" class="text-error" base-color="error"
                 />
            </v-list>
          </v-menu>
         
          <!-- <div class="position-absolute bg-surface text-caption rounded-circle d-flex align-center justify-center" style="top: 0px; right: 0px; width: 16px; height: 16px;">{{ index + 1 }}</div> -->
        </div>
      </div>
      <div class="d-flex align-center ga-2">
        <v-menu location="top" offset="10">
          <template #activator="{ props: tooltipProps }">
            <v-chip v-if="entries.length > 0" color="primary" variant="text" v-bind="tooltipProps" rounded="lg">
              <v-icon start>mdi-history</v-icon>
              {{ entries.length }} modifications
            </v-chip>
          </template>

          <v-card class="pa-4 rounded-lg">
            <div v-for="(entry, index) in entries" :key="entry._id">
              <span class="text-caption">{{ entry.createdAt }} : {{ entry.type }} {{ entry.subType }}</span>
            </div>
          </v-card>

        </v-menu>
        <span class="text-body-2 font-weight-bold">{{ formattedDate }}</span>
      </div>

    </div>



    <div class="mt-4 mb-4 rounded-xl bg-background pa-4 px-4 position-relative d-flex flex-column"
      :class="status === 'off' ? 'offDay' : ''">
      <div class="d-flex pl-2 align-center ga-2">
        <div v-if="!isBaseShift" class="d-flex align-center ga-1">
          <span class="text-h6 font-weight-medium text-disabled" style="">{{
            baseShift?.name }}</span>
          <div class="d-flex align-center ga-1" v-for="(entry, index) in history" :key="index">
            <v-icon size="x-small" icon="mdi-arrow-right-drop-circle-outline" color="primary" style="opacity: 0.8;" />
            <span v-if="entry.type === 'shift'" class="text-h6 font-weight-medium " style="">{{
              entry.shiftData?.shift?.name }}</span>
            <v-icon v-else :key="typeToIcon(entry?.type)" size="20" class="text-medium-emphasis">
              {{ typeIcon(entry?.type) }}
            </v-icon>
            <span v-if="entry.wasOverride" class="text-caption text-disabled" style="">Override</span>
          </div>
        </div>
        <!-- <div v-for="(shiftData, index) in shiftHistory" :key="index">
          <v-icon  size="x-small" icon="mdi-arrow-right-drop-circle-outline" color="primary"
            style="opacity: 0.8;" />
          <span class="text-h4 font-weight-medium" style="position: relative; top: 2px;">{{ shiftData?.shift?.name }}</span>
        </div> -->




        <v-chip rounded="lg" variant="flat" v-if="status === 'off'" size="small" color="error">
          Congé
        </v-chip>
      </div>




      <div class="d-flex align-center ga-2" style="position: absolute; top: 12px; right: 12px;">
        <v-tooltip text="Modifier" location="top">
          <template #activator="{ props: tooltipProps }">
            <v-btn v-bind="tooltipProps" icon size="small" variant="text" @click="openEntryDialog()">
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

      <div class="d-flex align-center pl-2 ga-3 mt-1">
        <div v-if="isRestDay" class="pb-0 mb-0">
          <span v-if="isRestDay" class="text-h6 font-weight-medium">Repos</span>
        </div>

        <div  class="d-flex align-start flex-column justify-space-between">
          <span v-if="isShift && !isRestDay" class="text-h3 font-weight-medium"
            :style="{ color: 'rgba(var(--v-theme-' + statusColor(status) + '), 0.8)' }"
            style="position: relative; top: 2px;">{{ getShiftName }}</span>
          <div class="d-flex flex-column ga-1">
            <div class="d-flex align-center ">
              <!-- <span class="text-caption font-weight-bold">{{ getShiftHours.startTime }} - {{ getShiftHours.endTime -->
              <!-- }}</span> -->
              
            </div>
            <div v-if="!isShift" class="d-flex align-start justify-space-between flex-column bg-primary rounded-xl">
              <span class="text-h7 font-weight-medium pl-4 pr-4 py-2">{{ dayType }}</span>
            </div>
            
          </div>

        </div>

        <div class="d-flex  flex-column justify-space-between">
          <HourRange v-if="getHours" :hours="getHours" :endsNextDay="getShiftEndsNextDay" />
          <div v-if="getShiftTeam" class="py-0 text-caption opacity-70"
            style="margin-top: -5px; font-size: 11px !important;">
            Dans l'équipe {{ getShiftTeam }}
          </div>
          <div v-else style="margin-top: -5px; font-size: 11px !important;">
            <span class="py-0 text-caption opacity-70">Commentaire bureau</span>
          </div>
        </div>
      </div>



      <!-- Sélecteur de vacation élémentaire -->
      <div v-if="!isRestDay" class="mt-4 d-flex ga-2 align-center justify-space-between align-self-end">
        <v-tooltip v-if="inPast && isShift" text="MDDA" location="top">
          <template #activator="{ props: tooltipProps }">
            <v-btn v-bind="tooltipProps" icon size="small" variant="flat" :color="'primary'" @click="registerMDDA()"
              :class="'selected'">
              <v-icon>mdi-clock-fast</v-icon>
            </v-btn>
          </template>
        </v-tooltip>

        <v-tooltip v-if="!isShift && !isOff" text="Modifier l'horaire" location="top">
          <template #activator="{ props: tooltipProps }">
            <v-btn v-bind="tooltipProps" icon size="small" variant="flat" :color="'primary'" @click="patchHours()"
              :class="'selected'">
              <v-icon>mdi-clock-edit-outline</v-icon>
            </v-btn>
          </template>
        </v-tooltip>
        <div v-if="isShift || hasNoDemand" class="d-flex align-center ga-2 chips-container">
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
            <v-tooltip v-if="isShift" text="VIC" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn v-bind="tooltipProps" icon size="small" variant="flat"
                  :color="status === 'vic' ? 'warning' : 'surfaceContainerHigh'" @click="registerVIC">
                  VIC
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip v-if="hasNoDemand" :text="isOff ? 'Annuler l\'absence' : 'Déclarer une absence'" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn v-bind="tooltipProps" :color="isOff ? 'error' : 'surfaceContainerHigh'" icon rounded="lg"
                  size="small" flat @click="registerAbsence" :class="isOff ? 'selected' : ''">
                  <v-icon>mdi-cancel</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>

        </div>
      </div>
    </div>

    <div
      
      class="d-flex justify-end ga-2 mt-4 position-relative">
      <v-slide-y-transition>
        <div v-if="isRestDay || isOff" class="text-error" style="position: absolute; top: 32px;">
          <span style="font-size: 10px !important; opacity: 0.6;">Impossible si absent ou repos</span>
        </div>
      </v-slide-y-transition>

      <div v-if="pendingDemand || acceptedAsPoster?.length > 0" class="d-flex">
        <v-btn color="error" height="36px" variant="tonal" class="flex-grow-1 d-flex flex-column rounded-xl text-none"
          @click="$emit('cancel', lastOwnDemand)">
          Annuler ma dernière demande
        </v-btn>
      </div>

      <div v-if="acceptedAsAccepter?.length > 0" class="d-flex">
        <v-btn color="error" height="36px" variant="tonal" :disabled="inPast"
          class="flex-1-1 d-flex flex-column rounded-xl text-none" rounded="lg" @click="emit('withdraw', lastAccepted)">
          Se désister
        </v-btn>
      </div>

      <v-tooltip v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)" text="Proposer un échange" location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" height="36" color="surfaceContainerHighest"
            style="border-radius: 12px !important;" max-width="50" width="50" size="" :slim="true"
            :disabled="isRestDay || inPast || isOff" :class="{ 'opacity-10': isRestDay || inPast || isOff }" flat
            @click="$emit('openRemplaDialog', 'switch')">
            <v-icon>mdi-swap-horizontal-hidden</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)" text="Demander un remplacement" location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" height="36px" color="primary" :disabled="isRestDay || inPast || isOff" flat
            rounded="xl" :class="{ 'opacity-10': isRestDay || inPast || isOff }"
            @click="$emit('openRemplaDialog', 'substitution')">
            <v-icon>mdi-account-arrow-left-outline</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
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

  <v-dialog v-model="entryDialog" max-width="500px">
    <v-card class="rounded-xl pa-6">
      <span class="text-h6">Ajouter une entrée</span>
      <div class="d-flex ga-2 mt-4 flex-wrap">
        <v-btn v-for="entry in entryTypes" :key="entry.key" size="small" @click="addCustomEntry(entry.key)">
          <template #prepend>
            <v-icon>{{ "mdi-" + entry.icon }}</v-icon>
          </template>
          {{ entry.label }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <ConfirmationDialog :model-value="confirmationDialog" :title="confirmationDialogTitle"
    :text="confirmationDialogMessage" @confirm="confirmEntry" @cancel="cancelEntry" />
</template>

<script setup>
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useAuthStore } from '@/stores/authStore';
import { planningModificationService } from '@/services/planningModificationService';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { getEffectiveShiftTimes, getDisplayShiftName } from '@/utils/getEffectiveShiftTimes';
import { entryTypes } from '@/utils/entryIcons';
import { getDemandIcon } from '@/utils/demandToIcon.js';

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

const entryDialog = ref(false);
const confirmationDialog = ref(false);
const confirmationDialogTitle = ref('Confirmation');
const confirmationDialogMessage = ref('');

const noShift = ref(false);


const entries = ref([]);
const emit = defineEmits(['openRemplaDialog', 'openDrawer', 'cancel', 'openAbsenceDialog', 'withdraw']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateKey = (d) => {
  if (!d) return null;
  const s = typeof d === 'string' ? d : d?.toISOString?.();
  return s?.slice(0, 10) ?? null;
};

const typeToIcon = (type) => {
  switch (type) {
    case 'switch':
      return 'mdi-swap-horizontal';
    case 'substitution':
      return 'mdi-account-arrow-left-outline';
    case 'hybrid':
      return 'mdi-account-arrow-left-outline';
    default:
      return 'mdi-close';
  }
};

const typeIcon = (type) => {
  const entry = entryTypes.find((entry) => entry.key === type);
  return entry ? "mdi-" + entry.icon : 'mdi-close';
};

const dayType = computed(() => {
  const type = getVacation.value?.type;
  const entryType = entryTypes.find((entry) => entry.key === type);
  return entryType ? entryType.label : null
});



const statusColor = (status) => {
  switch (status) {
    case 'off':
      return 'error';
    case 'vic':
      return 'warning';
    default:
      return 'onBackground';
  }
};

// ─── Core computeds ───────────────────────────────────────────────────────────

const getVacation = computed(() => {
  if (!props.selectedDate) return null;
  return shiftStore.persistentVacationsMap.get(toDateKey(props.selectedDate));
});

/** ISO string of selectedDate — avoids repeated `new Date(...).toISOString()` calls in the template */
const selectedDateIso = computed(() => new Date(props.selectedDate).toISOString());

const isRestDay = computed(() => getVacation.value?.shiftData?.shift?.type === 'rest');

const isShift = computed(() => {
  return !!getVacation.value?.shiftData?.shift
});

const history = computed(() => {
  console.log(getVacation.value?.history)
  return getVacation.value?.history

});

const status = computed(() => {
  if (getVacation.value?.shiftData?.selectedVariation === "vic") return "vic";
  if (getVacation.value?.shiftData?.selectedVariation) return 'variation';
  return null;
});

const type = computed(() => {
  return getVacation.value?.type;
});

const inPast = computed(() =>
  toDateKey(props.selectedDate) < toDateKey(new Date())
);

const isOff = computed(() =>
  getVacation.value?.isOff
);

const isBaseShift = computed(() => {
  return getVacation.value?.isBaseShift;
});

const baseShift = computed(() => {
  console.log(getVacation.value)
  return getVacation.value?.baseShift;
});

const openEntryDialog = () => {
  entryDialog.value = true;
}

const addCustomEntry = async (type, data) => {
  const dateKey = toDateKey(props.selectedDate);
  if (!dateKey) return;
  entryToRegister.value = {
    userId: authStore.userData.userId,
    type: 'assignment',
    entryType: type,
    date: dateKey,
  }
  registerEntry(type);
}

const selectVariationForDay = async (variation) => {
  const dateKey = toDateKey(props.selectedDate);
  if (!dateKey) return;
  entryToRegister.value = {
    type: 'modification',
    entryType: 'variation',
    date: dateKey,
    selectedVariation: variation ? variation._id : null,
    shift: getVacation.value?.shiftData?.shift?._id,
    centerId: authStore.userData?.centerId,
    confirmCreation: true
  };
  registerEntry();
};

const registerMDDA = async () => {
  const dateKey = toDateKey(props.selectedDate);
  if (!dateKey) return;
  entryToRegister.value = {
    type: 'hourPatch',
    date: dateKey,
    shift: getVacation.value?.shiftData?.shift?._id,
    centerId: authStore.userData?.centerId,
    confirmCreation: true
  };
  registerEntry();
};

const registerEntry = async (type) => {
  try {
    const res = await planningModificationService.registerEntry(entryToRegister.value);
    if (res.needsApproval) {
      confirmationDialog.value = true;
      confirmationDialogMessage.value = res.message;
      return;
    }

    console.log(res.userShift)
    entryDialog.value = false;
    shiftStore.addEntry(res.userShift[0], entryToRegister.value.date);

    entries.value = await fetchEntries();
  } catch (error) {
    console.log(error);
  }
}

const restoreInitialShift = async () => {
  try {
    const res = await planningModificationService.restoreInitialShift(authStore.userData.userId, toDateKey(props.selectedDate));
    shiftStore.addEntry(res.userShift[0], toDateKey(props.selectedDate));
    entries.value = await fetchEntries();
  } catch (err) {
    console.log(err);
    snackbarStore.showNotification('Erreur : ' + err.message, 'onError', 'mdi-alert-circle-outline');
  }
}

const confirmEntry = async () => {
  try {
    const res = await planningModificationService.registerEntry({ ...entryToRegister.value, confirmCreation: true });
    confirmationDialog.value = false;
    shiftStore.addEntry(res.userShift[0], entryToRegister.value.date);
    entryToRegister.value = null;
    entryDialog.value = false;

    entries.value = await fetchEntries();
  } catch (err) {
    console.log(err);
    snackbarStore.showNotification('Erreur : ' + err.message, 'onError', 'mdi-alert-circle-outline');
  }
};


const registerAbsence = async () => {
  try {
    const res = await planningModificationService.registerEntry({
      entryType: 'absence',
      type: 'assignment',
      date: toDateKey(props.selectedDate),
      cancel: isOff.value,
      //shift: getVacation.value?.shiftData?.shift?._id,
      comment: isOff.value ? 'Retour de congé' : 'Absence enregistrée',
      confirmCreation: true
    });

    shiftStore.addEntry(res.userShift[0], toDateKey(props.selectedDate));
    entries.value = await fetchEntries();
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'absence:', error);

  };
}

const registerVIC = async () => {
  try {
    const res = await planningModificationService.registerEntry({
      entryType: 'vic',
      type: 'modification',
      date: toDateKey(props.selectedDate),
      shift: getVacation.value?.shiftData?.shift?._id,
      confirmCreation: true
    });

    shiftStore.addEntry(res.userShift[0], toDateKey(props.selectedDate));
    entries.value = await fetchEntries();
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la VIC', error);

  };
}





const getShiftName = computed(() => getDisplayShiftName(getVacation.value));

const getShiftHours = computed(() => {
  const shift = getVacation.value?.shiftData?.shift;
  const selectedVariation = getVacation.value?.shiftData?.selectedVariation;
  const effective = shift ? getEffectiveShiftTimes(shift, selectedVariation) : null;
  return effective
    ? { startTime: effective.startTime, endTime: effective.endTime }
    : { startTime: '', endTime: '' };
});

const getHours = computed(() => {
  if (getVacation.value?.startTime && getVacation.value?.endTime) {
    return {startTime: getVacation.value?.startTime, endTime: getVacation.value?.endTime};
  }
  return null;
});

const getShiftEndsNextDay = computed(() => {
  const shift = getVacation.value?.shiftData?.shift;
  const selectedVariation = getVacation.value?.shiftData?.selectedVariation;
  const effective = shift ? getEffectiveShiftTimes(shift, selectedVariation) : null;
  return effective?.endsNextDay ?? false;
});

const getShiftTeam = computed(() => getVacation.value?.shiftData?.team?.name || '');

// ─── Variations ───────────────────────────────────────────────────────────────

const variations = computed(() => {
  if (!getVacation.value) return [];
  return getVacation.value.shiftData?.shift?.variations
});

const isVariationSelected = (variation) => {
  const current = getVacation.value?.shiftData?.selectedVariation;
  if (!current || !variation) return false;
  return (current._id || current)?.toString?.() === (variation._id || variation)?.toString?.();
};

const hasCustomEntry = computed(() => {
  return getVacation.value?.shiftData?.selectedVariation !== null || status.value === 'off';
});

const entryToRegister = ref(null);



const cancelEntry = () => {
  confirmationDialog.value = false;
  entryToRegister.value = null;
};


// ─── Absence ──────────────────────────────────────────────────────────────────


const fetchEntries = async () => {
  const dateKey = toDateKey(props.selectedDate);
  if (!dateKey) return;
  try {
    const data = await planningModificationService.fetchEntries(authStore.userData.userId, dateKey);

    return data;
  } catch (error) {

    console.log(error);
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
  return substitutionStore.acceptedAsAccepter.filter(d => d.posterShift.date === props.selectedDate);
});

const lastAccepted = computed(() => {
  if (!props.selectedDate) return null;
  return acceptedAsAccepter.value.sort((a, b) => b.createdAt - a.createdAt)[0];
});

const acceptedAsPoster = computed(() => {
  if (!props.selectedDate) return null;
  return substitutionStore.acceptedAsPoster.filter(d => d.posterShift.date === props.selectedDate);
});

const lastOwnDemand = computed(() => {
  if (!props.selectedDate) return null;
  return [pendingDemand.value, ...acceptedAsPoster.value].sort((a, b) => b.createdAt - a.createdAt)[0];
});

const substitutionsDemands = computed(() => {
  if (!props.selectedDate) return [];

  let toReturn = [
    ...acceptedAsAccepter.value,
    ...acceptedAsPoster.value
  ]
  if (pendingDemand.value) toReturn.push(pendingDemand.value);

  return toReturn.sort((a, b) => a.createdAt - b.createdAt);
});


const hasNoDemand = computed(() =>
  !pendingDemand.value && !acceptedAsPoster.value?.length && !acceptedAsAccepter.value?.length
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

watch(() => props.selectedDate, async (value) => {
  if (value) {
    entries.value = await fetchEntries();
  }
}, { immediate: true });

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
