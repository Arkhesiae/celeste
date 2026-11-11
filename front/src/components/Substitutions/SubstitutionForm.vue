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
            <span class="text-body-medium font-weight-bold">{{ formattedDate }}</span>
          </div>

          <div class="my-10 mt-3 rounded-xl bg-background pa-4 px-4 position-relative d-flex flex-column ga-4">
            <div class="d-flex align-center pl-2 ga-3">
              <div class="pb-0 mb-0">
                <span class="text-display-medium font-weight-medium" style="position: relative; top: 2px;">{{ shiftName }}</span>
              </div>
              <div class="d-flex align-start flex-column justify-space-between">
                <div>
                  <span class="text-body-small font-weight-bold">
                    {{ displayShiftHours.startTime }} - {{ displayShiftHours.endTime }}
                  </span>
                  <span v-if="displayShiftEndsNextDay" class="text-body-small font-weight-bold opacity-50 ml-1"
                    style="font-size: 10px !important; top: -2px; position: relative;">+1</span>
                </div>
                <div v-if="selectedShift?.teamObject?.name" class="py-0 text-body-small opacity-70"
                  style="margin-top: -8px; font-size: 11px !important;">
                  Dans l'équipe {{ selectedShift?.teamObject?.name }}
                </div>
              </div>
            </div>

            <div v-if="hasVariations" class="flex-shrink-1 pl-2 text-medium-emphasis">
              <span class="text-body-small mb-2">
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
            <v-card-title class="pa-0 pl-2  mb-0">
              <h2 class="text-title-large font-weight-medium">Permutations acceptées</h2>
            </v-card-title>
            <v-card-subtitle class="pa-0 ma-0 pl-2 text-body-small">
              Sélectionnez les vacations acceptées
            </v-card-subtitle>

            <div>
              <div v-if="loadingRotations" class="switch-grid ga-2">
                <v-skeleton-loader v-for="n in 6" :key="n" elevation="0" flat height="84" />
              </div>

              <v-alert v-else-if="rotationDays.length === 0" type="info" variant="tonal" rounded="lg" density="compact">
                Aucun tour de service actif à cette date.
              </v-alert>

              <!-- Un jour du tour de service actif à la date demandée par tuile : vacation, horaires, compatibilité -->
              <div v-else class="switch-grid ga-2" role="group" aria-label="Permutations acceptées">
                <button
                  v-for="day in rotationDays"
                  :key="day._id"
                  type="button"
                  class="tile switch-tile"
                  :class="{ 'switch-tile--incompatible': !day.compatible }"
                  :aria-pressed="acceptedSwitches.includes(day._id)"
                  @click="toggleSwitch(day._id)"
                >
                  <span class="switch-tile__name font-weight-bold">{{ day.name }}</span>
                  <span class="switch-tile__hours opacity-70">{{ day.hours }}</span>
                  <span v-if="day.compatible" class="switch-tile__status d-inline-flex align-center ga-1">
                    <v-icon icon="mdi-check-circle-outline" size="12" />Compatible
                  </span>
                  <span v-else class="switch-tile__status d-inline-flex align-center ga-1">
                    <v-icon icon="mdi-alert-circle-outline" size="12" />{{ day.reason }}
                  </span>
                </button>
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
                  <v-card-title class="text-title-large font-weight-medium pa-0 mb-2">Points par vacation</v-card-title>
                  <v-card-subtitle class="text-body-small pa-0 mb-4">
                    Définissez le nombre de points pour chaque permutation sélectionnée
                  </v-card-subtitle>
                </template>
                <template v-else>
                  <v-card-title class="text-title-large font-weight-medium pa-0 mb-2">Points proposés</v-card-title>
                  <v-card-subtitle class="text-body-small pa-0 mb-4">
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
                      <span class="text-body-medium font-weight-bold">{{ getSwitchName(switchDay) }}</span>
                    </div>
                    <div class="d-flex align-center ga-2">
                      <span class="text-body-medium font-weight-bold">{{ pointsPerSwitch[switchDay] }}</span>
                      <v-icon icon="mdi-pencil" size="12" color="onSurface" class="opacity-50" />
                    </div>
                  </div>
                  <v-divider class="mt-4" />
                </div>
              </div>

              <div v-if="dialogMode !== 'switch'" class="d-flex justify-start flex-column align-start mt-4">
                <div v-if="acceptedSwitchesWithPoints.length > 0" class="mb-4 pl-4">
                  <span class="text-body-small opacity-50">Remplacement</span>
                </div>
                <v-number-input v-model="demand.points" class="text-primary flex-grow-1" width="100%" :class="{
                  'excess': demand.points > defaultPoints + 3,
                  'low': demand.points < defaultPoints - 3
                }" :min="0" reverse control-variant="split" label="" rounded="xl" bg-color="surfaceContainer"
                  color="blue" glow :hide-input="false" inset base-color="transparent" variant="outlined" />
                <div style="height: 20px;">
                  <v-slide-y-transition>
                    <div v-if="demand.points !== defaultPoints">
                      <span class="text-body-small opacity-50">Points par défaut : {{ defaultPoints }}</span>
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

  <PointsDialog v-model="showPointsDialog" :points="switchPoints" :switch="switchToEdit" @update:points="updatePoints"
    @update:model-value="showPointsDialog = $event" />

  <ConfirmationDialog v-model="showConfirmationDialog" :title="'Nombre de points'"
    :text="'Êtes-vous sûr de vouloir poster une demande avec 0 point ?'" :confirm-text="'Poster quand même'"
    @confirm="confirmSubmit" @update:is-dialog-visible="showConfirmationDialog = $event" />
</template>

<script setup>
import { useDate } from 'vuetify';
import { toDateKey } from '@/utils/dateKey';
import { substitutionService } from '@/services/substitutionService';

const dialogVisible = defineModel('dialogVisible', { type: Boolean, required: true });

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

// Jours de référence : ceux du tour de service actif à la date demandée, tels que le serveur les a évalués
const hoursOf = (day) => (day.startTime && day.endTime ? `${day.startTime} – ${day.endTime}` : '');

const rotationDays = computed(() =>
  compatibleSwitches.value
    .filter(day => day._id !== props.selectedShift?.shift?._id)
    .map(day => ({
      _id: day._id,
      name: day.name,
      hours: hoursOf(day),
      compatible: day.compatible,
      reason: describeLimits(day.limit),
    }))
);

const isNextButtonDisabled = computed(() =>
  !localDate.value ||
  !props.selectedShift ||
  (props.dialogMode === 'switch' && acceptedSwitchesWithPoints.value.length === 0)
);

// Methods

const getSwitchName = (dayId) =>
  compatibleSwitches.value.find(day => day._id === dayId)?.name || 'Aucun shift sélectionné';

const isVariationSelected = (variation) => selectedVariant.value === variation._id;

const selectVariation = (variation) => {
  selectedVariant.value = variation?._id ?? '';
};

const describeLimits = (limits) => (limits || []).map(reason => {
  if (reason === 'insufficientRest') return 'Repos <11h après une période de service';
  if (reason === '35limit') return 'Repos consécutifs<35h sur 7 jours glissants';
  if (reason === '48hLimit') return 'Repos <48h sur 7 jours glissants';
  return reason;
}).join(', ');

const toggleSwitch = (dayId) => {
  acceptedSwitches.value = acceptedSwitches.value.includes(dayId)
    ? acceptedSwitches.value.filter(id => id !== dayId)
    : [...acceptedSwitches.value, dayId];
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
  if (!localDate.value) return [];
  return substitutionService.fetchCompatibleSwitches(toDateKey(localDate.value));
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

/* Vuetify n'a pas de classe d-grid */
.switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
}

.switch-tile__name { font-size: 18px; line-height: 1.1; }
.switch-tile__hours { font-size: 11px; }
.switch-tile__status { font-size: 10px; line-height: 1.2; }

/* Vacation que la règle de repos / de charge interdit : toujours choisissable, mais signalée */
.switch-tile--incompatible {
  --tile-accent: rgb(var(--v-theme-error));
  --tile-on-accent: rgb(var(--v-theme-onError));
}

/* Au repos : texte d'erreur ; sélectionnée, `.tile` met le fond en erreur et le texte en onError (contraste) */
.switch-tile--incompatible:not([aria-pressed='true']) {
  --tile-color: rgb(var(--v-theme-error));
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