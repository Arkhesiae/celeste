<template>
  <v-sheet :rounded="rounded" :elevation="elevation" class="py-4 px-4 position-relative safe-area-bottom"
    color="surfaceContainer">
    <div class="d-flex align-center justify-space-between mb-4 mr-2 ga-2">
      <div class="d-flex align-center ga-1">
        <div v-for="(entry, index) in substitutionsDemands" :key="index" class="position-relative">
          <v-menu min-width="200" offset="10">
            <template #activator="{ props }">
              <v-btn v-bind="props" color="primary" icon size="x-small"
                :variant="entry.status === 'open' ? 'tonal' : 'flat'">
                <v-icon> {{ getDemandIcon(entry, authStore.userData.userId) }}</v-icon>
              </v-btn>
            </template>
            <v-list rounded="xl" class="pa-2">
              <v-list-subheader>Je remplace dans ...</v-list-subheader>

              <v-list-item title="Détails" />

              <v-divider />

              <v-list-item prepend-icon="mdi-close-circle-outline" title="Annuler" class="text-error"
                base-color="error" />
            </v-list>
          </v-menu>
        </div>
      </div>

      <div class="d-flex align-center ga-2">
        <v-menu location="top" offset="10">
          <template #activator="{ props: tooltipProps }">
            <v-chip v-if="entries?.length > 0" color="primary" variant="text" v-bind="tooltipProps" rounded="lg">
              <v-icon start>mdi-history</v-icon>
              {{ entries?.length }} modifications
            </v-chip>
          </template>

          <v-card class="pa-4 rounded-lg">
            <div v-for="(entry, index) in entries" :key="entry._id">
              <span class="text-body-small">{{ entry.createdAt }} : {{ entry.type }} {{ entry.subType }}</span>
            </div>
          </v-card>

        </v-menu>
        <span class="text-body-medium font-weight-bold">{{ formattedDate }}</span>
      </div>
    </div>

    <ShiftCard class="bg-surfaceContainerHighest" :date="selectedDate" @open-entry-dialog="entryDialog = true"
      @entry-registered="entryDialog = false" />

    <div class="d-flex justify-end ga-2 mt-4 mb-4 position-relative">
      <v-slide-y-transition>
        <div v-if="disabled" class="text-error" style="position: absolute; top: 32px;">
          <span style="font-size: 10px !important; opacity: 0.6;">{{ disabledReason }}</span>
        </div>
      </v-slide-y-transition>

      <div v-if="pendingDemand || acceptedAsPoster?.length > 0" class="d-flex flex-column ga-2 flex-grow-1">
        <span v-if="pendingDemand" class="text-body-small text-medium-emphasis">
          Votre demande est en attente
        </span>
        <span v-else-if="acceptedAsPoster?.length > 0" class="text-body-small text-medium-emphasis">
          Vous êtes remplacé ce jour
        </span>
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

      <v-tooltip
        v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)"
        text="Proposer un échange" location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" height="36" color="surfaceContainerHighest"
            style="border-radius: 12px !important;" max-width="50" width="50" size="" :slim="true" :disabled="disabled"
            :class="{ 'opacity-10': disabled }" flat @click="$emit('openRemplaDialog', 'switch')">
            <v-icon>mdi-swap-horizontal-hidden</v-icon>
          </v-btn>
        </template>
      </v-tooltip>

      <v-tooltip
        v-if="!substitutionStore.hasOwnPendingDemand(selectedDate) && !substitutionStore.hasAcceptedAsPoster(selectedDate)"
        text="Demander un remplacement" location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-btn v-bind="tooltipProps" height="36px" color="primary" :disabled="disabled" flat rounded="xl"
            :class="{ 'opacity-10': disabled }" @click="$emit('openRemplaDialog', 'substitution')">
            <v-icon>mdi-account-arrow-left-outline</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </div>

    <v-fade-transition mode="out-in">
      <div v-if="availableSubstitutions.length > 0 || availableSwitches.length > 0 || otherDemands.length > 0"
        class="d-flex ga-1 mb-2">
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
      <div v-else class="mb-2">
        <span style="font-size: 12px !important; opacity: 0.6;">Aucune demande disponible</span>
      </div>

    </v-fade-transition>

    <v-btn
      :class="{ 'opacity-10': availableSubstitutions.length === 0 && availableSwitches.length === 0 && otherDemands.length === 0 }"
      :disabled="availableSubstitutions.length === 0 && availableSwitches.length === 0 && otherDemands.length === 0"
      width="100%" flat rounded="xl" height="64px" color="background" append-icon="mdi-chevron-right"
      class="justify-space-between d-flex align-center text-title-small" @click="$emit('openDrawer', 'substitutions')">
      <span v-if="availableSubstitutions.length > 0 || availableSwitches.length > 0 || otherDemands.length > 0">
        Voir les demandes disponibles
      </span>

    </v-btn>
  </v-sheet>

  <v-dialog v-model="entryDialog" max-width="500px">
    <v-card class="rounded-xl pa-6">
      <span class="text-title-large">Ajouter une entrée</span>
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
import { entryTypes } from '@/utils/entryIcons';
import { getDemandIcon } from '@/utils/demandToIcon.js';
import { useDate } from 'vuetify';
import { sameDateKey, toDateKey } from '@/utils/dateKey';

const substitutionStore = useSubstitutionStore();
const snackbarStore = useSnackbarStore();
const authStore = useAuthStore();
const shiftStore = useShiftStore();

const props = defineProps({
  selectedDate: {
    type: [String, null],
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
});

const entryDialog = ref(false);
const confirmationDialog = ref(false);
const confirmationDialogTitle = ref('Confirmation');
const confirmationDialogMessage = ref('');
const date = useDate();

const formattedDate = computed(() => {
  if (!props.selectedDate) return '';
  return date.format(props.selectedDate, 'fullDate');
});

const entries = ref([]);
const emit = defineEmits(['openRemplaDialog', 'openDrawer', 'cancel', 'openAbsenceDialog', 'withdraw']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getVacation = computed(() => {
  if (!props.selectedDate) return null;
  return shiftStore.persistentVacationsMap.get(toDateKey(props.selectedDate));
});

const isRestDay = computed(() => getVacation.value?.shiftData?.shift?.type === 'rest');

const isShift = computed(() => {
  return !!getVacation.value?.shiftData?.shift
});

const disabled = computed(() => {
  return isRestDay.value || inPast.value || isOff.value || !isShift.value
});

const disabledReason = computed(() => {
  if (inPast.value) return 'Date passée'
  if (isRestDay.value) return 'Jour de repos'
  if (substitutionStore.hasAcceptedAsPoster(props.selectedDate)) {
    return 'Vous êtes remplacé ce jour'
  }
  if (!isShift.value) return 'Aucun shift valide'
  if (isOff.value) return 'Confirmez votre présence pour poster une demande'
  return ''
})

const inPast = computed(() =>
  toDateKey(props.selectedDate) < toDateKey(new Date())
);

const isOff = computed(() =>
  Boolean(getVacation.value?.isOff)
);

const fetchEntries = async () => {
  const res = await planningModificationService.fetchEntries(authStore.userData.userId, toDateKey(props.selectedDate));
  entries.value = res;
}

const addCustomEntry = async (type) => {
  const dateKey = toDateKey(props.selectedDate);
  if (!dateKey) return;
  entryToRegister.value = {
    userId: authStore.userData.userId,
    type: 'assignment',
    entryType: type,
    startTime: "09:00",
    endTime: "17:00",
    date: dateKey,
  }
  registerEntry();
}

const registerEntry = async () => {
  try {
    const res = await planningModificationService.registerEntry(entryToRegister.value);
    if (res.needsApproval) {
      confirmationDialog.value = true;
      confirmationDialogMessage.value = res.message;
      return;
    }

    entryDialog.value = false;
    shiftStore.addEntry(res.userShift[0], entryToRegister.value.date);
    entries.value = await fetchEntries();
  } catch (error) {
    snackbarStore.showNotification(error.message, 'onError', 'mdi-alert-circle-outline');
    console.log(error);
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

// ─── Variations ───────────────────────────────────────────────────────────────

const entryToRegister = ref(null);


const cancelEntry = () => {
  confirmationDialog.value = false;
  entryToRegister.value = null;
};

// ─── Absence ──────────────────────────────────────────────────────────────────

// ─── Substitution state ───────────────────────────────────────────────────────

const pendingDemand = computed(() => [
  ...substitutionStore.ownPendingHybridSubstitutions,
  ...substitutionStore.ownPendingTrueSubstitutions,
  ...substitutionStore.ownPendingTrueSwitches
].find(d => sameDateKey(d.posterShift?.date, props.selectedDate)));

const acceptedAsAccepter = computed(() => {
  if (!props.selectedDate) return null;
  return substitutionStore.acceptedAsAccepter.filter(d => sameDateKey(d.posterShift?.date, props.selectedDate));
});

const lastAccepted = computed(() => {
  if (!props.selectedDate) return null;
  return acceptedAsAccepter.value.sort((a, b) => b.createdAt - a.createdAt)[0];
});

const acceptedAsPoster = computed(() => {
  if (!props.selectedDate) return null;
  return substitutionStore.acceptedAsPoster.filter(d => sameDateKey(d.posterShift?.date, props.selectedDate));
});

const lastOwnDemand = computed(() => {
  if (!props.selectedDate) return null;
  return [pendingDemand.value, ...acceptedAsPoster.value].sort((a, b) => b.createdAt - a.createdAt)[0];
});

const substitutionsDemands = computed(() => {
  if (!props.selectedDate) return [];

  const toReturn = [
    ...acceptedAsAccepter.value,
    ...acceptedAsPoster.value
  ]
  if (pendingDemand.value) toReturn.push(pendingDemand.value);

  return toReturn.sort((a, b) => a.createdAt - b.createdAt);
});


const availableSubstitutions = computed(() =>
  substitutionStore.availableSubstitutions.filter(d => sameDateKey(d.posterShift?.date, props.selectedDate))
);

const availableSwitches = computed(() =>
  substitutionStore.availableSwitches.filter(d => sameDateKey(d.posterShift?.date, props.selectedDate))
);

const otherDemands = computed(() =>
  substitutionStore.otherDemands.filter(d => sameDateKey(d.posterShift?.date, props.selectedDate))
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

.transition-block {
  transition: all 0.5s ease-in-out;
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
