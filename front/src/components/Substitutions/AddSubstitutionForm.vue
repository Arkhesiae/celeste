

<template>
  <GenericDialog v-model="isDialogVisible" :title="dialogTitle" max-width="600px" @close="close">
    <template #actions>
      <v-btn v-if="currentWindow === 1" variant="flat" rounded="xl" size="small" color="onBackground"
        :prepend-icon="dialogMode === 'switch' ? 'mdi-swap-horizontal' : 'mdi-account-arrow-right-outline'"
        :loading="submitting" :disabled="!formValid || !selectedShift || submitting" @click="submit">
        Poster
      </v-btn>
    </template>
    <template #content>
      <v-window v-model="currentWindow" class="pt-1 pa-0" height="100">
        <v-window-item :value="0">
          <div class="d-flex mt-8 justify-space-between">
            <v-icon icon="mdi-calendar" class="mr-4 mt-4"></v-icon>
            <v-text-field rounded="lg" class="cursor-pointer mt-00" bg-color="surface" v-model="formattedDate"
              persistent-hint hint="Remplacement" label="Date de remplacement" :rules="[rules.required, rules.date]"
              @blur="formatDateForDisplay" @focus="formatDateForInput" disabled
              @update:model-value="handleDateChange"></v-text-field>

          </div>
          <div class="my-12">

            <div class="my-10 rounded-xl bg-background pa-4 px-8 position-relative">
              <div class="d-flex align-center  ga-3">
                <div class="pb-0 mb-0">

                  <span class="text-h5 font-weight-medium" style="position: relative; top: 2px;">{{ shiftName }}</span>
                </div>
                <div class="d-flex align-start flex-column justify-space-between">
                  <div>
                    <span class="text-caption font-weight-bold">{{ selectedShift?.shift?.default?.startTime }} - {{
                      selectedShift?.shift?.default?.endTime
                      }}</span>
                    <span class="text-caption font-weight-bold opacity-50 ml-1"
                      style="font-size: 10px !important; top: -2px; position: relative;"
                      v-if="shiftEndsNextDay">+1</span>
                  </div>
                  <div class="py-0 text-caption opacity-70" style="margin-top: -8px; font-size: 11px !important;"
                    v-if="selectedShift?.teamObject?.name">Dans l'équipe {{ selectedShift?.teamObject?.name
                    }}</div>

                </div>
                <div v-if="selectedShift?.shift?.variations?.length > 0 && !shiftEndsNextDay"
                  class="variation-badge align-self-start">
                  <v-icon size="10" class="text-caption font-weight-bold text-background">mdi-clock</v-icon>
                  <span class="text-caption font-weight-bold text-background">?</span>

                </div>


              </div>
            </div>

            <!-- <span class="text-caption mt-8 pa-4">
                <v-icon start icon="mdi-information-outline"></v-icon>
                En cliquant sur <b>TBD</b>, votre remplaçant déterminera l'horaire effectué à postériori.
              </span> -->

            <span class="text-caption mt-8 pa-4">
              <v-icon start icon="mdi-information-outline"></v-icon>
              En cliquant sur une <b>variante</b>, votre pouvez définir l'horaire de votre remplacement.
            </span>
            <span class="text-caption mt-8 pa-4 text-error">

              Fonctionnalité à venir
            </span>
          </div>
          <v-card color="transparent" class="my-12 pa-0" elevation="0">
            <v-card-item class="">
              <v-card-title class="pa-0 mb-0">
                <h2 class="text-h6 font-weight-medium">Permutations acceptées</h2>
              </v-card-title>
              <v-card-subtitle class="pt-0 text-caption">Sélectionnez les vacations acceptées</v-card-subtitle>
            </v-card-item>
            <v-card-text class="">
              <!-- Skeleton loader pour le chargement -->
              <div v-if="loadingRotations" class="d-flex flex-wrap ga-2">
                <v-skeleton-loader v-for="n in 6" :key="n" elevation="0" flat width="40"
                  height="32"></v-skeleton-loader>
              </div>

              <!-- Contenu réel quand le chargement est terminé -->
              <v-chip-group v-else v-model="acceptedSwitches" multiple color="surface" :rules="[rules.rotations]">
                <div v-for="day in rotationDays" :key="day._id" class="d-flex align-center">
                  <v-chip :value="day._id" class="ma-1" rounded="lg" variant="flat"
                    :class="isSwitchAvailable(day._id) ? '' : 'text-error'" base-color="transparent" color="transparent">
                    <template v-if="day.type === 'rest'">
                      <v-icon start icon="mdi-bed-outline"></v-icon>
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
              <div v-for="switchDay in acceptedSwitches"  :key="switchDay" >
             
                <div class="d-flex align-center pa-2 mb-2 " style="background-color: rgba(var(--v-theme-error), 0.05); border-radius: 10px; " v-if="!isSwitchAvailable(switchDay)">
                  <v-icon icon="mdi-swap-horizontal" color="error" size="16" class="opacity-70"></v-icon>
                  <div class="text-error d-flex align-center ga-2">
                    <span class="text-body-2  font-weight-bold">{{ switchName(switchDay) }}</span>
                    <span class=" " style="font-size: 12px !important;">{{ getUnavailabilityReason(switchDay) }}</span>
                  </div>
                  
                </div>

            
              </div>
              </div>
            </v-card-text>
          </v-card>
        </v-window-item>

        <v-window-item :value="1">
          <v-progress-circular v-if="loadingRotations" indeterminate color="primary" class="ma-4"></v-progress-circular>
          <v-alert v-else-if="rotationError" type="error" variant="tonal" class="mt-2" rounded="lg">
            {{ rotationError }}
          </v-alert>
          <template v-else>
            <v-form ref="addForm">


              <div>
                <v-textarea rounded="xl" v-model="demand.comment" no-resize label="Commentaire" variant="solo-filled"
                  flat color="surfaceContainer" bg-color="surface"></v-textarea>

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
                  @click="editPoints(switchDay)" cursor="pointer">
                  <div class="d-flex align-center justify-space-between ga-2">
                    <div class="d-flex align-center ga-2">
                      <v-icon icon="mdi-swap-horizontal" size="16" class="opacity-70"></v-icon>
                      <span class="text-body-2  font-weight-bold">{{ switchName(switchDay) }}</span>
                    </div>
                    <div class="d-flex align-center ga-2">
                      <span class="text-body-2  font-weight-bold">{{ pointsPerSwitch[switchDay] }}</span>
                      <v-icon icon="mdi-pencil" size="12" color="onSurface" class="opacity-50"></v-icon>
                    </div>
                  </div>
                  <v-divider class="mt-4"></v-divider>





                </div>
              </div>


              <div class="d-flex justify-start flex-column align-start mt-4" v-if="dialogMode !== 'switch'">
                <div v-if="acceptedSwitchesWithPoints.length > 0" class="mb-4 pl-4">
                  <span class="text-caption opacity-50">Remplacement</span>
                </div>
                <v-number-input v-model="demand.points" class="text-primary flex-grow-1" width="100%" :class="{
                  'excess': demand.points > defaultPoints + 3,
                  'low': demand.points < defaultPoints - 3
                }" :min="0" reverse controlVariant="split" label="" rounded="xl" bg-color="surfaceContainer"
                  color="blue" glow :hideInput="false" inset base-color="transparent" variant="outlined">


                </v-number-input>
                <div class=" " style="height: 20px;">
                  <v-slide-y-transition>
                    <div v-if="demand.points !== defaultPoints">
                      <span class="text-caption opacity-50 ">Points par défaut : {{defaultPoints }} </span>
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
          <v-btn variant="tonal" size="small" rounded="xl" color="secondary" :disabled="isNextButtonDisabled"
            @click="currentWindow = 1">
            Suivant
          </v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" color="secondary" size="small" @click="currentWindow = 0">Retour</v-btn>
          <v-btn variant="flat" rounded="xl" size="small" color="onBackground"
            :prepend-icon="dialogMode === 'switch' ? 'mdi-swap-horizontal' : 'mdi-account-arrow-left-outline'"
            :disabled="!formValid || !selectedShift || submitting" :loading="submitting" @click="submit">
            Poster la demande
          </v-btn>
        </template>
      </div>
    </template>
  </GenericDialog>

  <PointsDialog :isDialogVisible="showPointsDialog" :points="switchPoints" :switch="switchToEdit"
    @update:isDialogVisible="showPointsDialog = $event" @update:points="updatePoints" />

  <ConfirmationDialog :isDialogVisible="showConfirmationDialog" :title="'Nombre de points'"
    :text="'Êtes-vous sûr de vouloir poster une demande avec 0 point ?'" :confirmColor="'remplacement'"
    :confirmText="'Poster quand même'" @confirm="confirmSubmit"
    @update:isDialogVisible="showConfirmationDialog = $event" />
</template>


<script setup>
import { ref, watch, computed } from 'vue';
import { useDisplay, useDate } from 'vuetify';
import { useRotationStore } from '@/stores/rotationStore';
import { useCenterStore } from '@/stores/centerStore';
import { useAuthStore } from '@/stores/authStore';
import { vacationService } from '@/services/vacationService';
import { calculateRestDelay } from '@/utils/shiftUtils';
import ConfirmationDialog from '@/components/Dialogs/ConfirmationDialog.vue';
import GenericDialog from '@/components/Dialogs/GenericDialog.vue';
import PointsDialog from '@/components/Dialogs/PointsDialog.vue';
import { substitutionService } from '@/services/substitutionService';
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

// Stores et utilitaires
const { smAndDown } = useDisplay();
const dateUtil = useDate();
const rotationStore = useRotationStore();
const centerStore = useCenterStore();
const authStore = useAuthStore();

const pointsPerSwitch = ref({});
const switchPoints = ref(0);
const acceptedSwitches = ref([]);

const acceptedSwitchesWithPoints = computed(() => {
  return acceptedSwitches.value.map(dayId => ({
    shift: dayId,
    points: pointsPerSwitch.value[dayId]
  }));
});

const defaultPoints = ref(10);

// États du composant
const demand = ref({
  comment: '',
  points: defaultPoints.value,
  acceptedSwitches: []
});





const compatibleSwitches = ref([]);
const loadingRotations = ref(false);
const rotationError = ref(null);
const formattedDate = ref('');
const localDate = ref('');
const currentWindow = ref(0);
const formValid = ref(false);
const selectedVariant = ref(null);
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
      if (!(dayId in pointsPerSwitch)) {
        pointsPerSwitch.value[dayId] = 0;
      }
    });
  }
});

// Méthodes utilitaires
const toDisplayFormat = (input) => (input ? dateUtil.format(input, 'fullDate') : '');

const formatDateForDisplay = () => {
  if (localDate.value) {
    formattedDate.value = dateUtil.format(localDate.value, 'fullDate');
  }
};

const formatDateForInput = () => {
  if (localDate.value) {
    formattedDate.value = dateUtil.format(localDate.value, 'keyboardDate');
  }
};

const handleDateChange = () => {
  if (localDate.value) {
    emit('update:date', localDate.value);
  }
};

const shiftName = computed(() => {
  return props.selectedShift?.shift?.name || 'Aucun shift sélectionné';
});

const switchName = computed(() => (dayId) => {
  return rotationDays.value.find(day => day._id === dayId)?.name || 'Aucun shift sélectionné';
});

const shiftEndsNextDay = computed(() => {
  return props.selectedShift?.shift?.default?.endsNextDay || false;
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


// Watchers
watch(() => props.dialogVisible, async (value) => {
  if (value) {
    localDate.value = props.date;
    formattedDate.value = props.date ? toDisplayFormat(props.date) : '';
    
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
    points: defaultPoints.value,
    acceptedSwitches: []
  };

  selectedVariant.value = null;
  localDate.value = '';
  formattedDate.value = '';
};

const submit = () => {
  if (demand.value.points === 0 && dialogModeValue.value !== 'switch') {
    showConfirmationDialog.value = true;
    return;
  } else if (dialogModeValue.value === 'switch' && acceptedSwitchesWithPoints.value.every(switchItem => switchItem.points === 0)) {
    showConfirmationDialog.value = true;
    return;
  }


  emit('onSubmit', {
    ...demand.value,
    date: localDate.value,
    selectedShift: props.selectedShift,
    acceptedSwitches: acceptedSwitchesWithPoints.value,
    isTrueSwitch: dialogModeValue.value === 'switch'
  });
};

const confirmSubmit = () => {
  showConfirmationDialog.value = false;
  emit('onSubmit', {
    ...demand.value,
    date: localDate.value,
    selectedShift: props.selectedShift,
    acceptedSwitches: acceptedSwitchesWithPoints.value,
    isTrueSwitch: dialogModeValue.value === 'switch'
  });
};

const close = () => {
  resetForm();
  isDialogVisible.value = false;
};

const isNextButtonDisabled = computed(() => {
  return !localDate.value || !props.selectedShift || (dialogModeValue.value === 'switch' && acceptedSwitchesWithPoints.value.length === 0);
});



const editPoints = (switchDay) => {
  switchToEdit.value = {id : switchDay, name : switchName.value(switchDay)};
  switchPoints.value = pointsPerSwitch.value[switchDay];
  showPointsDialog.value = true;
};

const updatePoints = (data) => {
  
  pointsPerSwitch.value = { ...pointsPerSwitch.value, [data.switchDay]: data.points };
};

</script>

<style scoped>
:deep(.v-number-input .v-field__field input) {
  color: rgb(var(--v-theme-remplacement)) !important;
  font-size: 1.5rem;
  font-weight: 600;
}

:deep(.v-number-input.secondary .v-field__field input) {
  color: rgb(var(--v-theme-secondary)) !important;
  font-size: 1rem;
  font-weight: 600;
}

:deep(.v-btn--icon) {
  color: rgb(var(--v-theme-remplacement)) !important;
  background-color: rgb(var(--v-theme-surface-container)) !important;


}


:deep(.v-number-input.excess .v-field__field input) {
  color: rgb(var(--v-theme-error)) !important;
  font-size: 1.5rem;
  font-weight: 600;

}

:deep(.v-number-input.excess .v-btn--icon) {
  color: rgba(255, 0, 0, 0.5) !important;


}


:deep(.v-number-input.excess .v-field__overlay) {
  background-color: rgba(255, 0, 0, 0.05) !important;


}

:deep(.v-number-input.low .v-field__field input) {
  color: rgba(40, 140, 90, 0.9) !important;
  font-size: 1.5rem;
  font-weight: 600;
}

:deep(.v-number-input.low .v-field__overlay) {
  background-color: rgba(40, 140, 90, 0.05) !important;

}

:deep(.v-number-input.low .v-btn--icon) {
  color: rgba(40, 140, 90, 0.5) !important;
}
</style>
