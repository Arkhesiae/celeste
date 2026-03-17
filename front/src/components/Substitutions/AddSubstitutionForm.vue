<template>
  <GenericDialog v-model="isDialogVisible" :title="dialogTitle" max-width="600px" @close="close">
    <template #actions>

      <v-btn v-if="currentWindow === 1" variant="flat" rounded="xl"
        :prepend-icon="dialogMode === 'switch' ? 'mdi-swap-horizontal' : 'mdi-account-arrow-right-outline'"
        :loading="submitting" :disabled="!formValid || !selectedShift || submitting" @click="submit">
        Poster
      </v-btn>
    </template>
    <template #content>
      <v-window v-model="currentWindow" class="pt-1 pa-0" height="100">
        <v-window-item :value="0">
          <div class="d-flex align-center text-primary justify-end mb-2 mx-2">
            <span class="text-body-2 font-weight-bold">{{ formattedDate }}</span>
          </div>



          <div class="my-10 mt-3 rounded-xl bg-background pa-4 px-4 position-relative d-flex flex-column ga-4">
            <div class="d-flex align-center pl-2 ga-3">
              <div class="pb-0 mb-0">
                <span class="text-h3 font-weight-medium" style="position: relative; top: 2px;">{{ shiftName }}</span>
              </div>
              <div class="d-flex align-start flex-column justify-space-between">
                <div>
                  <span class="text-caption font-weight-bold">{{ displayShiftHours.startTime }} - {{
                    displayShiftHours.endTime
                  }}</span>
                  <span v-if="displayShiftEndsNextDay" class="text-caption font-weight-bold opacity-50 ml-1"
                    style="font-size: 10px !important; top: -2px; position: relative;">+1</span>
                </div>
                <div v-if="selectedShift?.teamObject?.name" class="py-0 text-caption opacity-70"
                  style="margin-top: -8px; font-size: 11px !important;">
                  Dans l'équipe {{ selectedShift?.teamObject?.name
                  }}
                </div>
              </div>
            </div>
            <div v-if="hasVariations" class="flex-shrink-1 pl-2 text-medium-emphasis">
              <span class="text-caption mb-2">
                <v-icon start icon="mdi-information-outline" size="small" />
                Choisissez une variante pour préciser l'horaire (optionnel, peut rendre plus de permutations
                compatibles). {{ preselectedVariantHint }}
              </span>

            </div>

            <!-- Sélecteur de vacation élémentaire -->
            <div class="mt-4 d-flex align-center justify-space-between align-self-end">

              <div class="d-flex align-center ga-2 chips-container">
                <div class="d-flex align-center chips-container-alt">
                  <v-btn v-for="v in selectedShift?.shift?.variations" :key="v._id" icon size="small" variant="flat"
                    :color="isVariationSelected(v) ? 'primary' : 'surfaceContainerHigh'" @click="selectVariation(v)"
                    :class="isVariationSelected(v) ? 'selected' : ''">
                    {{ v.name }}
                  </v-btn>
                </div>
                <v-scale-transition>
                  <div v-if="selectedVariant">
                    <v-btn color="transparent" flat @click="selectVariation(null)" size="small" icon>
                      <v-icon>mdi-refresh</v-icon>
                    </v-btn>
                  </div>
                </v-scale-transition>
              </div>
            </div>
          </div>


          <v-card color="transparent" class="my-12 pa-0" elevation="0">
            <v-card-item class="">
              <v-card-title class="pa-0 mb-0">
                <h2 class="text-h6 font-weight-medium">
                  Permutations acceptées
                </h2>
              </v-card-title>
              <v-card-subtitle class="pt-0 text-caption">
                Sélectionnez les vacations acceptées
              </v-card-subtitle>
            </v-card-item>
            <v-card-text class="">
              <!-- Skeleton loader pour le chargement -->
              <div v-if="loadingRotations" class="d-flex flex-wrap ga-2">
                <v-skeleton-loader v-for="n in 6" :key="n" elevation="0" flat width="40" height="32" />
              </div>

              <!-- Contenu réel quand le chargement est terminé -->
              <v-chip-group v-else v-model="acceptedSwitches" multiple color="surface" :rules="[rules.rotations]">
                <div v-for="day in rotationDays" :key="day._id" class="d-flex align-center">
                  <v-chip :value="day._id" class="ma-1" rounded="lg" variant="flat"
                    :class="isSwitchAvailable(day._id) ? '' : 'text-error'" base-color="transparent"
                    color="transparent">
                    <template v-if="day.type === 'rest'">
                      <v-icon start icon="mdi-bed-outline" />
                    </template>
                    <template v-if="!isSwitchAvailable(day._id)">
                      <v-tooltip activator="parent" location="top">
                        {{ getUnavailabilityReason(day._id) }}
                      </v-tooltip>
                    </template>
                    {{ day.name }}
                  </v-chip>
                </div>
              </v-chip-group>

              <div v-if="acceptedSwitches.length > 0" class="mt-4 d-flex flex-column ">
                <div v-for="switchDay in acceptedSwitches" :key="switchDay">
                  <div v-if="!isSwitchAvailable(switchDay)" class="d-flex align-center pa-2 mb-2 "
                    style="background-color: rgba(var(--v-theme-error), 0.05); border-radius: 10px; ">
                    <v-icon icon="mdi-swap-horizontal" color="error" size="16" class="opacity-70" />
                    <div class="text-error d-flex align-center ga-2">
                      <span class="text-body-2  font-weight-bold">{{ switchName(switchDay) }}</span>
                      <span class=" " style="font-size: 12px !important;">{{ getUnavailabilityReason(switchDay)
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item :value="1">

          <v-progress-circular v-if="loadingRotations" indeterminate color="primary" class="ma-4" />
          <v-alert v-else-if="rotationError" type="error" variant="tonal" class="mt-2" rounded="lg">
            {{ rotationError }}
          </v-alert>
          <template v-else>
            <v-form ref="addForm">
              <div>
                <v-textarea v-model="demand.comment" rounded="xl" no-resize label="Commentaire" variant="solo-filled"
                  flat color="surfaceContainer" bg-color="surface" />
              </div>


              <div class="mt-8">
                <div v-if="acceptedSwitchesWithPoints.length > 0">
                  <v-card-title class="text-h6 font-weight-medium pa-0 mb-2">
                    Points par vacation
                  </v-card-title>

                  <v-card-subtitle class="text-caption pa-0 mb-4">
                    Définissez le nombre de points pour chaque permutation sélectionnée
                  </v-card-subtitle>
                </div>

                <div v-else>
                  <v-card-title class="text-h6 font-weight-medium pa-0 mb-2">
                    Points proposés
                  </v-card-title>
                  <v-card-subtitle class="text-caption pa-0 mb-4">
                    Définissez le nombre de points pour le remplacement
                  </v-card-subtitle>
                </div>
              </div>


              <div v-if="acceptedSwitchesWithPoints.length > 0" class="d-flex flex-column ga-4 my-8">
                <div v-for="switchDay in acceptedSwitches" :key="switchDay" class="d-flex flex-column cursor-pointer"
                  @click="editPoints(switchDay)">
                  <div class="d-flex align-center justify-space-between ga-2">
                    <div class="d-flex align-center ga-2">
                      <v-icon icon="mdi-swap-horizontal" size="16" class="opacity-70" />
                      <span class="text-body-2  font-weight-bold">{{ switchName(switchDay) }}</span>
                    </div>
                    <div class="d-flex align-center ga-2">
                      <span class="text-body-2  font-weight-bold">{{ pointsPerSwitch[switchDay] }}</span>
                      <v-icon icon="mdi-pencil" size="12" color="onSurface" class="opacity-50" />
                    </div>
                  </div>
                  <v-divider class="mt-4" />
                </div>
              </div>


              <div v-if="dialogMode !== 'switch'" class="d-flex justify-start flex-column align-start mt-4">
                <div v-if="acceptedSwitchesWithPoints.length > 0" class="mb-4 pl-4">
                  <span class="text-caption opacity-50">Remplacement</span>
                </div>
                <v-number-input v-model="demand.points" class="text-primary flex-grow-1" width="100%" :class="{
                  'excess': demand.points > defaultPoints + 3,
                  'low': demand.points < defaultPoints - 3
                }" :min="0" reverse control-variant="split" label="" rounded="xl" bg-color="surfaceContainer"
                  color="blue" glow :hide-input="false" inset base-color="transparent" variant="outlined" />
                <div style="height: 20px;">
                  <v-slide-y-transition>
                    <div v-if="demand.points !== defaultPoints">
                      <span class="text-caption opacity-50">Points par défaut : {{ defaultPoints }}</span>
                    </div>
                  </v-slide-y-transition>
                </div>
              </div>
            </v-form>
          </template>
        </v-window-item>
      </v-window>
    </template>

    <template #footer>
      <div class="d-flex justify-space-between pa-0">
        <template v-if="currentWindow === 0">
          <v-spacer />
          <v-btn variant="tonal" rounded="xl" color="secondary" :disabled="isNextButtonDisabled"
            @click="currentWindow = 1">
            Suivant
          </v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" color="secondary" size="small" @click="currentWindow = 0">
            Retour
          </v-btn>
          <v-btn variant="flat" rounded="xl"
            :prepend-icon="dialogMode === 'switch' ? 'mdi-swap-horizontal' : 'mdi-account-arrow-left-outline'"
            :disabled="!formValid || !selectedShift || submitting" :loading="submitting" @click="submit">
            Poster la demande
          </v-btn>
        </template>
      </div>
    </template>
  </GenericDialog>

  <PointsDialog :is-dialog-visible="showPointsDialog" :points="switchPoints" :switch="switchToEdit"
    @update:is-dialog-visible="showPointsDialog = $event" @update:points="updatePoints" />

  <ConfirmationDialog v-model="showConfirmationDialog" :title="'Nombre de points'"
    :text="'Êtes-vous sûr de vouloir poster une demande avec 0 point ?'" :confirm-color="'remplacement'"
    :confirm-text="'Poster quand même'" @confirm="confirmSubmit"
    @update:is-dialog-visible="showConfirmationDialog = $event" />
</template>


<script setup>
import { useDate } from 'vuetify';
import { useRotationStore } from '@/stores/rotationStore';
import ConfirmationDialog from '@/components/Dialogs/ConfirmationDialog.vue';
import GenericDialog from '@/components/Dialogs/GenericDialog.vue';
import PointsDialog from '@/components/Dialogs/PointsDialog.vue';
import { substitutionService } from '@/services/substitutionService';
import { getEffectiveShiftTimes } from '@/utils/getEffectiveShiftTimes';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
const props = defineProps({
  dialogMode: { type: String, required: true },
  dialogVisible: { type: Boolean, required: true },
  date: { type: String },
  submitting: { type: Boolean, required: true },
  selectedShift: {
    type: Object,
  }
});

const emit = defineEmits([
  'onClose',
  'onSubmit',
  'update:dialogModeValue',
  'update:dialogVisible',
  'update:date'
]);

const dateUtil = useDate();
const rotationStore = useRotationStore();

const pointsPerSwitch = ref({});
const switchPoints = ref(0);
const defaultPoints = ref(10);
const acceptedSwitches = ref([]);

const acceptedSwitchesWithPoints = computed(() => {
  return acceptedSwitches.value.map(dayId => ({
    shift: dayId,
    points: pointsPerSwitch.value[dayId]
  }));
});


const demand = ref({
  comment: '',
  acceptedSwitches: []
});

const compatibleSwitches = ref([]);
const loadingRotations = ref(false);
const rotationError = ref(null);
const formattedDate = ref('');
const localDate = ref('');
const currentWindow = ref(0);
const formValid = ref(false);
const selectedVariant = ref('');
const showConfirmationDialog = ref(false);

const showPointsDialog = ref(false);
const switchToEdit = ref(null);

// Règles de validation
const rules = {
  required: v => !!v || 'Ce champ est requis',
  points: v => v >= 0 || 'Les points doivent être positifs',
  date: v => !!v || 'Une date est requise',
  rotations: v => v.length > 0 || 'Au moins un jour de rotation doit être sélectionné'
};

// Computed properties
const dialogModeValue = computed({
  get: () => props.dialogMode,
  set: (value) => emit('update:dialogModeValue', value),
});

const isDialogVisible = computed({
  get: () => props.dialogVisible,
  set: (value) => emit('update:dialogVisible', value),
});

const dialogTitle = computed(() =>
  dialogModeValue.value === 'substitution' ? 'Demander un remplacement' : 'Demande de permutation'
);

const activeRotation = computed(() => {
  const rotations = rotationStore.sortedRotations;
  const demandDate = new Date(props.date);
  for (const rotation of rotations) {
    if (new Date(rotation.startDate) <= demandDate && (new Date(rotation.endDate) >= demandDate || !rotation.endDate)) {
      const rotationObject = rotationStore.rotations.find(r => r._id === rotation._id);
      return rotationObject;
    }
  }
  return null;
});


const rotationDays = computed(() => {
  if (!activeRotation.value) return [];
  return activeRotation.value.days.filter(day => day.type !== 'rest' && day._id !== props.selectedShift?.shift._id).map((day, index) => ({
    _id: day._id,
    index: index,
    name: day.name,
    type: day.type
  }));
});

// Watcher pour mettre à jour formValid
watch(
  [
    () => demand.value.points,
    () => localDate.value,
    () => acceptedSwitchesWithPoints.value
  ],
  () => {
    formValid.value =
      demand.value.points >= 0 &&
      localDate.value !== '' &&
      ((dialogModeValue.value === 'switch' && acceptedSwitchesWithPoints.value.length > 0) ||
        (dialogModeValue.value !== 'switch' && demand.value.points >= 0));
  },
  { immediate: true }
);

watch(acceptedSwitches, (newSwitches, oldSwitches) => {
  if (oldSwitches) {
    const newDays = newSwitches.filter(dayId => !oldSwitches.includes(dayId));
    newDays.forEach(dayId => {
      if (!(dayId in pointsPerSwitch.value)) {
        pointsPerSwitch.value[dayId] = 0;
      }
    });
  }
});


const toDisplayFormat = (input) => (input ? dateUtil.format(input, 'fullDate') : '');

const editPoints = (switchDay) => {
  switchToEdit.value = { id: switchDay, name: switchName.value(switchDay) };
  switchPoints.value = pointsPerSwitch.value[switchDay];
  showPointsDialog.value = true;
};

const updatePoints = (data) => {
  pointsPerSwitch.value = { ...pointsPerSwitch.value, [data.switchDay]: data.points };
};


const shiftName = computed(() => {
  return props.selectedShift?.shift?.name || 'Aucun shift sélectionné';
});

// // Source prioritaire pour les variations : rotation (days peuplés) > selectedShift.shift (vacations API)
// const shiftWithVariations = computed(() => {
//   const shift = props.selectedShift?.shift;
//   if (!shift || !activeRotation.value?.days?.length) return shift;
//   const shiftId = shift._id || shift.id;
//   const shiftName = shift.name;
//   const dayFromRotation = activeRotation.value.days.find(
//     d => (d._id || d)?.toString?.() === shiftId?.toString?.() || d?.name === shiftName
//   );
//   return dayFromRotation ?? shift;
// });

const isVariationSelected = (variation) => {
  return selectedVariant.value === variation._id;
};

const selectVariation = (variation) => {
  selectedVariant.value = variation?._id;
};

const hasVariations = computed(() => {
  return props.selectedShift?.shift?.variations?.length > 0;
});

const displayShiftHours = computed(() => {
  const shift = props.selectedShift.shift;
  const variant = selectedVariant.value && shift?.variations?.length
    ? shift.variations.find(v => (v._id || v)?.toString?.() === selectedVariant.value?.toString?.())
    : null;
  const effective = shift ? getEffectiveShiftTimes(shift, variant || null) : null;
  return effective ? { startTime: effective.startTime, endTime: effective.endTime } : { startTime: '', endTime: '' };
});

const displayShiftEndsNextDay = computed(() => {
  const shift = props.selectedShift.shift;
  const variant = selectedVariant.value && shift?.variations?.length
    ? shift.variations.find(v => (v._id || v)?.toString?.() === selectedVariant.value?.toString?.())
    : null;
  const effective = shift ? getEffectiveShiftTimes(shift, variant || null) : null;
  return effective?.endsNextDay ?? false;
});

const switchName = computed(() => (dayId) => {
  return rotationDays.value.find(day => day._id === dayId)?.name || 'Aucun shift sélectionné';
});

const fetchCompatibleSwitches = async () => {
  if (!props.date) return [];
  return substitutionService.fetchCompatibleSwitches(props.date.split('T')[0]);;
};

const isSwitchAvailable = function (shiftId) {
  const isCompatible = compatibleSwitches.value.find(shift => shift._id === shiftId)?.compatible;
  return isCompatible;
};

const getUnavailabilityReason = function (shiftId) {
  const unavailabilityReason = compatibleSwitches.value.find(shift => shift._id === shiftId)?.limit
  const text = [];
  if (!unavailabilityReason) return null;
  for (const reason of unavailabilityReason) {
    if (reason === 'insufficientRest') text.push("Repos <11h après une période de service");
    if (reason === '35limit') text.push("Repos consécutifs<35h sur 7 jours glissants");
    if (reason === '48hLimit') text.push("Repos <48h sur 7 jours glissants");
  }

  return text.join(', ');
};


const preselectedVariantHint = computed(() =>
  props.selectedShift?.selectedVariation ? 'Variante pré-remplie depuis votre calendrier.' : ''
);



// Watchers
watch(() => props.dialogVisible, async (value) => {
  if (value) {
    localDate.value = props.date;
    formattedDate.value = props.date ? toDisplayFormat(props.date) : '';

    // Pré-remplir la variante si l'agent l'a déjà choisie dans le calendrier
    const sv = props.selectedShift?.selectedVariation;
    if (sv) {
      selectedVariant.value = (sv._id || sv)?.toString?.() || sv;
    }

    // Recharger les rotations pour avoir les variations à jour
    const centerId = authStore.userData?.centerId;
    if (centerId) {
      await rotationStore.fetchRotations(centerId);
    }

    demand.value.points = dialogModeValue.value === 'substitution' ? defaultPoints.value : 0;

    // Charger les données compatibles quand le dialogue s'ouvre
    try {
      loadingRotations.value = true;
      rotationError.value = null;
      compatibleSwitches.value = await fetchCompatibleSwitches();
    } catch (error) {
      console.error('Erreur lors du chargement du tour de service:', error);
      rotationError.value = 'Erreur lors du chargement du tour de service. Veuillez réessayer.';
    } finally {
      loadingRotations.value = false;
    }
  } else {
    resetForm();
  }
});

watch(() => props.date, (newDate) => {
  if (newDate) {
    localDate.value = newDate;
    formattedDate.value = toDisplayFormat(newDate);
  }
});

const resetForm = () => {
  currentWindow.value = 0;
  formValid.value = false;
  acceptedSwitches.value = [];
  demand.value = {
    comment: '',
    points: 0,
    acceptedSwitches: []
  };

  selectedVariant.value = '';
  localDate.value = '';
  formattedDate.value = '';
};

const buildSubmitPayload = () => ({
  ...demand.value,
  date: localDate.value,
  selectedShift: {
    ...props.selectedShift,
    selectedVariation: selectedVariant.value || null
  },
  acceptedSwitches: acceptedSwitchesWithPoints.value,
  isTrueSwitch: dialogModeValue.value === 'switch'
});

const isZeroPoints = () =>
  dialogModeValue.value === 'switch'
    ? acceptedSwitchesWithPoints.value.every(s => s.points === 0)
    : demand.value.points === 0;

const submit = () => {
  if (isZeroPoints()) {
    showConfirmationDialog.value = true;
    return;
  }
  emit('onSubmit', buildSubmitPayload());
};

const confirmSubmit = () => {
  showConfirmationDialog.value = false;
  emit('onSubmit', buildSubmitPayload());
};

const close = () => {
  resetForm();
  isDialogVisible.value = false;
};

const isNextButtonDisabled = computed(() => {
  return !localDate.value || !props.selectedShift || (dialogModeValue.value === 'switch' && acceptedSwitchesWithPoints.value.length === 0);
});



</script>

<style scoped>
:deep(.v-number-input .v-field__field input) {
  font-size: 1.5rem;
}

:deep(.v-number-input.secondary .v-field__field input) {
  color: rgb(var(--v-theme-secondary)) !important;
  font-size: 1rem;
  font-weight: 600;
}

/* :deep(.v-btn--icon) {
  color: rgb(var(--v-theme-remplacement)) !important;
  background-color: rgb(var(--v-theme-surface-container)) !important;
} */


:deep(.v-number-input.excess .v-field__field input) {
  color: rgb(var(--v-theme-error)) !important;
  font-size: 1.5rem;

}



:deep(.v-number-input.low .v-field__field input) {
  /* color: rgba(40, 140, 90, 0.9) !important; */
  font-size: 1.5rem;
  font-weight: 600;
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
</style>
