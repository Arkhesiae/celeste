<template>
  <GenericDialog v-model="dialogVisible" :title="dialogTitle" max-width="600px" @close="closeDialog">
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
                  <span class="text-caption font-weight-bold">
                    {{ displayShiftHours.startTime }} - {{ displayShiftHours.endTime }}
                  </span>
                  <span v-if="displayShiftEndsNextDay" class="text-caption font-weight-bold opacity-50 ml-1"
                    style="font-size: 10px !important; top: -2px; position: relative;">+1</span>
                </div>
                <div v-if="selectedShift?.teamObject?.name" class="py-0 text-caption opacity-70"
                  style="margin-top: -8px; font-size: 11px !important;">
                  Dans l'équipe {{ selectedShift?.teamObject?.name }}
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
                    :color="isVariationSelected(v) ? 'primary' : 'surfaceContainerHigh'"
                    :class="isVariationSelected(v) ? 'selected' : ''" @click="selectVariation(v)">
                    {{ v.name }}
                  </v-btn>
                </div>
                <v-scale-transition>
                  <div v-if="selectedVariant">
                    <v-btn color="transparent" flat size="small" icon @click="selectVariation(null)">
                      <v-icon>mdi-refresh</v-icon>
                    </v-btn>
                  </div>
                </v-scale-transition>
              </div>
            </div>
          </div>

          <div>
            <v-card-title class="pa-0 pl-2 mb-0">
              <h2 class="text-h6 font-weight-medium">Permutations acceptées</h2>
            </v-card-title>
            <v-card-subtitle class="pa-0 pl-2 text-caption">
              Sélectionnez les vacations acceptées
            </v-card-subtitle>

            <div>
              <div v-if="loadingRotations" class="d-flex flex-wrap ga-2">
                <v-skeleton-loader v-for="n in 6" :key="n" elevation="0" flat width="40" height="32" />
              </div>


              <v-chip-group v-else v-model="acceptedSwitches" multiple color="surface" :rules="[rules.rotations]">
                <div v-for="day in rotationDays" :key="day._id" class="d-flex align-center ">
                  <v-chip :value="day._id" class="ma-1 switch-chip" rounded="lg" selected-class="selected"
                    variant="flat" base-color="surfaceContainer" color="primary"
                    :class="isSwitchAvailable(day._id) ? '' : 'text-error'">
                    <template v-if="day.type === 'rest'">
                      <v-icon start icon="mdi-bed-outline" />
                    </template>
                    <template v-if="!isSwitchAvailable(day._id)">
                      <v-tooltip activator="parent" location="top">
                        {{ getUnavailabilityReason(day._id) }}
                      </v-tooltip>
                    </template>
                    <span class="text-body-2 font-weight-bold">{{ day.name }}</span>
                  </v-chip>
                </div>
              </v-chip-group>

              <div v-if="acceptedSwitches.length > 0" class="d-flex flex-column">
                <div v-for="switchDay in acceptedSwitches" :key="switchDay">
                  <div v-if="!isSwitchAvailable(switchDay)" class="d-flex align-center pa-2 mb-2"
                    style="background-color: rgba(var(--v-theme-error), 0.05); border-radius: 10px;">
                    <v-icon icon="mdi-swap-horizontal" color="error" size="16" class="opacity-70" />
                    <div class="text-error d-flex align-center ga-2">
                      <span class="text-body-2 font-weight-bold">{{ getSwitchName(switchDay) }}</span>
                      <span style="font-size: 12px !important;">{{ getUnavailabilityReason(switchDay) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                <template v-if="acceptedSwitchesWithPoints.length > 0">
                  <v-card-title class="text-h6 font-weight-medium pa-0 mb-2">Points par vacation</v-card-title>
                  <v-card-subtitle class="text-caption pa-0 mb-4">
                    Définissez le nombre de points pour chaque permutation sélectionnée
                  </v-card-subtitle>
                </template>
                <template v-else>
                  <v-card-title class="text-h6 font-weight-medium pa-0 mb-2">Points proposés</v-card-title>
                  <v-card-subtitle class="text-caption pa-0 mb-4">
                    Définissez le nombre de points pour le remplacement
                  </v-card-subtitle>
                </template>
              </div>

              <div v-if="acceptedSwitchesWithPoints.length > 0" class="d-flex flex-column ga-4 my-8">
                <div v-for="switchDay in acceptedSwitches" :key="switchDay" class="d-flex flex-column cursor-pointer"
                  @click="editPoints(switchDay)">
                  <div class="d-flex align-center justify-space-between ga-2">
                    <div class="d-flex align-center ga-2">
                      <v-icon icon="mdi-swap-horizontal" size="16" class="opacity-70" />
                      <span class="text-body-2 font-weight-bold">{{ getSwitchName(switchDay) }}</span>
                    </div>
                    <div class="d-flex align-center ga-2">
                      <span class="text-body-2 font-weight-bold">{{ pointsPerSwitch[switchDay] }}</span>
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
          <v-btn variant="text" rounded="xl" :disabled="isNextButtonDisabled" @click="currentWindow = 1">
            Suivant
          </v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" color="secondary" @click="currentWindow = 0">
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

  <PointsDialog v-model="showPointsDialog" :points="switchPoints" :switch="switchToEdit"
    @update:points="updatePoints" @update:model-value="showPointsDialog = $event" />

  <ConfirmationDialog v-model="showConfirmationDialog" :title="'Nombre de points'"
    :text="'Êtes-vous sûr de vouloir poster une demande avec 0 point ?'" :confirm-text="'Poster quand même'"
    @confirm="confirmSubmit" @update:is-dialog-visible="showConfirmationDialog = $event" />
</template>

<script setup>
import { useDate } from 'vuetify';
import { useRotationStore } from '@/stores/rotationStore';
import { substitutionService } from '@/services/substitutionService';
import { useAuthStore } from '@/stores/authStore';

const dialogVisible = defineModel('dialogVisible', { type: Boolean, required: true });

const authStore = useAuthStore();
const props = defineProps({
  dialogMode: { type: String, required: true },
  date: { type: String },
  submitting: { type: Boolean, required: true },
  selectedShift: { type: Object }
});

const emit = defineEmits([
  'onSubmit',
  'update:dialogVisible',
  'update:date'
]);

const dateUtil = useDate();
const rotationStore = useRotationStore();

const pointsPerSwitch = ref({});
const switchPoints = ref(0);
const defaultPoints = ref(10);
const acceptedSwitches = ref([]);

const acceptedSwitchesWithPoints = computed(() =>
  acceptedSwitches.value.map(dayId => ({
    shift: dayId,
    points: pointsPerSwitch.value[dayId]
  }))
);

const demand = ref({
  comment: '',
  points: 0,
  acceptedSwitches: []
});

const compatibleSwitches = ref([]);
const loadingRotations = ref(false);
const rotationError = ref(null);
const localDate = ref('');
const currentWindow = ref(0);
const formValid = ref(false);
const selectedVariant = ref('');
const showConfirmationDialog = ref(false);
const showPointsDialog = ref(false);
const switchToEdit = ref(null);

// Computed

const displayShiftHours = computed(() => {
  const variation = props.selectedShift?.selectedVariation;
  if (!variation) return { startTime: '', endTime: '' };
  return { startTime: variation.startTime, endTime: variation.endTime };
});

const displayShiftEndsNextDay = computed(() => {
  return props.selectedShift?.selectedVariation?.endsNextDay ?? false;
});

const shiftName = computed(() => props.selectedShift?.shift?.name || 'Aucun shift sélectionné');

const hasVariations = computed(() => props.selectedShift?.shift?.variations?.length > 0);

const formattedDate = computed(() => props.date ? dateUtil.format(props.date, 'fullDate') : '');

const dialogTitle = computed(() =>
  props.dialogMode === 'substitution' ? 'Demander un remplacement' : 'Demande de permutation'
);

const preselectedVariantHint = computed(() =>
  props.selectedShift?.selectedVariation ? 'Variante pré-remplie depuis votre calendrier.' : ''
);

const activeRotation = computed(() => {
  const demandDate = new Date(props.date);
  for (const rotation of rotationStore.sortedRotations) {
    const start = new Date(rotation.startDate);
    const end = rotation.endDate ? new Date(rotation.endDate) : null;
    if (start <= demandDate && (!end || end >= demandDate)) {
      return rotationStore.rotations.find(r => r._id === rotation._id);
    }
  }
  return null;
});

const rotationDays = computed(() => {
  if (!activeRotation.value) return [];
  return activeRotation.value.days
    .filter(day => day.type !== 'rest' && day._id !== props.selectedShift?.shift._id)
    .map((day, index) => ({
      _id: day._id,
      index,
      name: day.name,
      type: day.type
    }));
});

const isNextButtonDisabled = computed(() =>
  !localDate.value ||
  !props.selectedShift ||
  (props.dialogMode === 'switch' && acceptedSwitchesWithPoints.value.length === 0)
);

// Règles de validation
const rules = {
  required: v => !!v || 'Ce champ est requis',
  points: v => v >= 0 || 'Les points doivent être positifs',
  date: v => !!v || 'Une date est requise',
  rotations: v => v.length > 0 || 'Au moins un jour de rotation doit être sélectionné'
};

// Methods

const getSwitchName = (dayId) =>
  rotationDays.value.find(day => day._id === dayId)?.name || 'Aucun shift sélectionné';

const isVariationSelected = (variation) => selectedVariant.value === variation._id;

const selectVariation = (variation) => {
  selectedVariant.value = variation?._id ?? '';
};

const isSwitchAvailable = (shiftId) =>
  compatibleSwitches.value.find(shift => shift._id === shiftId)?.compatible ?? false;

const getUnavailabilityReason = (shiftId) => {
  const limits = compatibleSwitches.value.find(shift => shift._id === shiftId)?.limit;
  if (!limits) return null;
  return limits.map(reason => {
    if (reason === 'insufficientRest') return 'Repos <11h après une période de service';
    if (reason === '35limit') return 'Repos consécutifs<35h sur 7 jours glissants';
    if (reason === '48hLimit') return 'Repos <48h sur 7 jours glissants';
    return reason;
  }).join(', ');
};

const editPoints = (switchDay) => {
  switchToEdit.value = { id: switchDay, name: getSwitchName(switchDay) };
  switchPoints.value = pointsPerSwitch.value[switchDay];
  showPointsDialog.value = true;
};

const updatePoints = (data) => {
  pointsPerSwitch.value = { ...pointsPerSwitch.value, [data.switchDay]: data.points };
};

const fetchCompatibleSwitches = async () => {
  if (!props.date) return [];
  return substitutionService.fetchCompatibleSwitches(props.date.split('T')[0]);
};

const closeDialog = () => emit('update:dialogVisible', false);

const resetForm = () => {
  currentWindow.value = 0;
  formValid.value = false;
  acceptedSwitches.value = [];
  demand.value = { comment: '', points: 0, acceptedSwitches: [] };
  selectedVariant.value = '';
  localDate.value = '';
};

const buildSubmitPayload = () => ({
  ...demand.value,
  date: localDate.value,
  selectedShift: {
    ...props.selectedShift,
    selectedVariation: selectedVariant.value || null
  },
  acceptedSwitches: acceptedSwitchesWithPoints.value,
  isTrueSwitch: props.dialogMode === 'switch'
});

const isZeroPoints = () =>
  props.dialogMode === 'switch'
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

// Watchers

watch(
  [() => demand.value.points, () => localDate.value, () => acceptedSwitchesWithPoints.value],
  () => {
    formValid.value =
      demand.value.points >= 0 &&
      localDate.value !== '' &&
      (
        (props.dialogMode === 'switch' && acceptedSwitchesWithPoints.value.length > 0) ||
        (props.dialogMode !== 'switch' && demand.value.points >= 0)
      );
  },
  { immediate: true }
);

watch(acceptedSwitches, (newSwitches, oldSwitches) => {
  if (!oldSwitches) return;
  newSwitches
    .filter(dayId => !oldSwitches.includes(dayId))
    .forEach(dayId => {
      if (!(dayId in pointsPerSwitch.value)) {
        pointsPerSwitch.value[dayId] = 0;
      }
    });
});

watch(() => props.dialogVisible, async (value) => {
  if (value) {
    localDate.value = props.date;
    const centerId = authStore.userData?.centerId;
    if (centerId) {
      await rotationStore.fetchRotations(centerId);
    }
    demand.value.points = props.dialogMode === 'substitution' ? defaultPoints.value : 0;

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
  if (newDate) localDate.value = newDate;
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

:deep(.v-number-input.excess .v-field__field input) {
  color: rgb(var(--v-theme-error)) !important;
  font-size: 1.5rem;
}

:deep(.v-number-input.low .v-field__field input) {
  font-size: 1.5rem;
  font-weight: 600;
}

.switch-chip {
  transition: border-radius var(--motion-expressive-fast-spatial),
    background-color var(--motion-expressive-fast-effects);
}



.switch-chip.selected {
  border-radius: 20px !important;
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