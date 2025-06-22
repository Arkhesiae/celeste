<script setup>
import { ref, watch, computed, onMounted } from 'vue';
import { useDisplay, useDate } from 'vuetify';
import { useRotationStore } from '@/stores/rotationStore';
import { useCenterStore } from '@/stores/centerStore';
import { useAuthStore } from '@/stores/authStore';
import { vacationService } from '@/services/vacationService';
import { calculateRestDelay } from '@/utils/shiftUtils';
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue';

const props = defineProps({
  dialogMode: { type: String, required: true },
  dialogVisible: { type: Boolean, required: true },
  date: { type: String },
  vacationsOfUser: {
    type: Map,
    required: true
  },
  selectedVacation: {
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
const acceptedSwitches = ref([]);

const acceptedSwitchesWithPoints = computed(() => {
  return acceptedSwitches.value.map(dayId => ({
    shift: dayId,
    points: pointsPerSwitch.value[dayId]
  }));
});

// États du composant
const demand = ref({
  comment: '',
  points: 0,
  acceptedSwitches: []
});




const adjacentVacations = ref({ prev: null, next: null });
const loadingRotations = ref(false);
const rotationError = ref(null);
const formattedDate = ref('');
const localDate = ref('');
const currentWindow = ref(0);
const formValid = ref(false);
const selectedVariant = ref(null);
const showConfirmationDialog = ref(false);
const defaultPoints = ref(0);

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
  const centerId = authStore.centerId;
  return centerStore.activeRotationsByCenter[centerId];
});

const selectedRotationDay = computed(() => {
  if (!props.selectedVacation?.shift || !rotationStore.rotations) return null;
  // Parcourir toutes les rotations pour trouver le jour correspondant
  for (const rotation of rotationStore.rotations) {
    const foundDay = rotation.days?.find(day => day._id === props.selectedVacation.shift);
    if (foundDay) {
      demand.value.points = foundDay.defaultPoints;
      defaultPoints.value = foundDay.defaultPoints;
      return {
        shift: foundDay,
        teamObject: props.selectedVacation.teamObject,
        rotationName: rotation.name // Ajouter le nom de la rotation pour référence
      };
    }
  }
  return null;
});

const rotationDays = computed(() => {
  if (!activeRotation.value) return [];
  return activeRotation.value.days.filter(day => day.type !== 'rest').map((day, index) => ({
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
      (dialogModeValue.value !== 'switch' && demand.value.points > 0));
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

// Mettre à jour la fonction getAdjacentVacations pour utiliser le service
const getAdjacentVacations = async (date) => {
  if (!date) return { prev: null, next: null };
  return await vacationService.getAdjacentVacations(authStore.userId, date);
};

const getDayName = (dayId) => {
  return rotationDays.value.find(day => day._id === dayId)?.name || 'Aucun shift sélectionné';
};

// État pour stocker les vacations adjacentes


// Mettre à jour la fonction isDayAvailable
const isDayAvailable = computed(() => (rotationDay) => {
  if (!props.selectedVacation || !rotationDay) return false;
  const rotationShift = activeRotation.value.days.filter(day => day.type !== 'rest')[rotationDay.index];
  // Vérifier le délai de repos minimum (par exemple 11h)
  const MIN_REST_HOURS = 11;
  // Vérifier le délai avec la vacation précédente
  if (adjacentVacations.value.prev?.shift) {
    const prevDelay = calculateRestDelay(adjacentVacations.value.prev.shift, rotationShift);
    if (prevDelay < MIN_REST_HOURS) return false;
  }

  // Vérifier le délai avec la vacation suivante
  if (adjacentVacations.value.next?.shift) {
    const nextDelay = calculateRestDelay(rotationShift, adjacentVacations.value.next.shift);
    if (nextDelay < MIN_REST_HOURS) return false;
  }
  console.log(rotationShift._id, props.selectedVacation)
  // Vérifier s'il s'agit de la même vacation
  if (rotationShift._id === props.selectedVacation.shift) {
    return false;
  }

  return true;
});

// Fonction pour obtenir le message d'erreur pour un jour
const getUnavailabilityReason = computed(() => (rotationDay) => {
  if (!props.selectedVacation || !rotationDay) return "Vacation non sélectionnée";
  if (rotationDay.type === 'rest') return "Jour de repos";

  const rotationShift = activeRotation.value.days.filter(day => day.type !== 'rest')[rotationDay.index];
  const MIN_REST_HOURS = 11;

  // Vérifier le délai avec la vacation précédente
  if (adjacentVacations.value.prev?.shift) {
    const prevDelay = calculateRestDelay(adjacentVacations.value.prev.shift, rotationShift);
    if (prevDelay < MIN_REST_HOURS) {
      return `Délai de repos insuffisant avec la vacation précédente (${Math.round(prevDelay)}h)`;
    }
  }

  // Vérifier le délai avec la vacation suivante
  if (adjacentVacations.value.next?.shift) {
    const nextDelay = calculateRestDelay(rotationShift, adjacentVacations.value.next.shift);
    if (nextDelay < MIN_REST_HOURS) {
      return `Délai de repos insuffisant avec la vacation suivante (${Math.round(nextDelay)}h)`;
    }
  }
  // Vérifier s'il s'agit de la même vacation
  if (rotationShift._id === props.selectedVacation.shift) {
    return "Vous ne pouvez pas permuter avec vous-même";
  }

  return null;
});

// Mettre à jour les vacations adjacentes lorsque la date change
watch(() => props.date, async (newDate) => {
  if (newDate) {
    adjacentVacations.value = await getAdjacentVacations(newDate);
  }
}, { immediate: true });

// Lifecycle hooks
onMounted(async () => {
  try {
    loadingRotations.value = true;
    rotationError.value = null;

  } catch (error) {
    console.error('Erreur lors du chargement du tour de service:', error);
    rotationError.value = 'Erreur lors du chargement du tour de service. Veuillez réessayer.';
  } finally {
    loadingRotations.value = false;
  }
});

// Watchers
watch(() => props.dialogVisible, (value) => {
  if (value) {
    localDate.value = props.date;
    formattedDate.value = props.date ? toDisplayFormat(props.date) : '';
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

// Méthodes de gestion du formulaire
const resetForm = () => {
  formValid.value = false;
  demand.value = {
    comment: '',
    points: 0,
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
    selectedVacation: props.selectedVacation,
    acceptedSwitches: acceptedSwitchesWithPoints.value,
    isTrueSwitch: dialogModeValue.value === 'switch'
  });
};

const confirmSubmit = () => {
  showConfirmationDialog.value = false;
  emit('onSubmit', {
    ...demand.value,
    date: localDate.value,
    selectedVacation: props.selectedVacation,
    acceptedSwitches: acceptedSwitchesWithPoints.value,
    isTrueSwitch: dialogModeValue.value === 'switch'
  });
};

const close = () => {
  isDialogVisible.value = false;
};

// Computed properties
const isNextButtonDisabled = computed(() => {
  return !localDate.value || !props.selectedVacation;
});
</script>

<template>
  <v-dialog v-model="isDialogVisible" max-width="600px" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" elevation="8" class="pa-6">
      <v-card-title class="d-flex justify-space-between align-center pa-0">
        <div class="text-h5">{{ dialogTitle }}</div>
        <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
      </v-card-title>

      <v-card-text class="pa-0">
        <v-window v-model="currentWindow" class="pt-1 pa-0" height="100">
          <!-- Première fenêtre : Sélection de la date et de la vacation -->
          <v-window-item :value="0">
            <div class="d-flex mt-8 justify-space-between">
              <v-icon icon="mdi-calendar" class="mr-4 mt-4"></v-icon>
              <v-text-field rounded="lg" class="cursor-pointer mt-00" bg-color="surface" v-model="formattedDate"
                persistent-hint hint="Remplacement" label="Date de remplacement" :rules="[rules.required, rules.date]"
                @blur="formatDateForDisplay" @focus="formatDateForInput" disabled
                @update:model-value="handleDateChange"></v-text-field>

            </div>
            <div class="my-12">
              <v-card rounded="xl" color="background" class="mb-2" flat>
                <v-card-item>
                  <v-card-title class="pb-0 mb-0">
                    <h2 class="text-h4 font-weight-medium">{{ selectedRotationDay?.shift?.name || 'Aucun shift sélectionné'
                      }}
                    </h2>
                  </v-card-title>
                  <v-card-subtitle class="pt-0 text-caption">Dans équipe {{ selectedRotationDay?.teamObject?.name ||
                    'Aucune équipe' }}</v-card-subtitle>

                  <v-card-subtitle class="pt-0"
                    v-if="selectedVariant && selectedRotationDay?.shift?.variants.length !== 0">
                    {{selectedRotationDay?.shift?.variants.find(v => v._id === selectedVariant)?.startTime || ''}} -
                    {{selectedRotationDay?.shift?.variants.find(v => v._id === selectedVariant)?.endTime || ''}}
                  </v-card-subtitle>
                  <v-card-subtitle class="pt-0" v-else>
                    {{ selectedRotationDay?.shift?.startTime || '' }} - {{ selectedRotationDay?.shift?.endTime || '' }}
                  </v-card-subtitle>

                  <div class="position-absolute top-0 right-0 mr-1 mt-1">
                    <v-chip-group v-model="selectedVariant" base-color="background" variant="flat" rounded="lg"
                      size="small">
                      <v-chip v-for="variant in selectedRotationDay?.shift?.variants" :key="variant._id"
                        :value="variant._id" color="onBackground" variant="flat" rounded="lg" size="small">
                        <v-icon start icon="mdi-clock-outline"></v-icon>
                        {{ variant.name }}
                      </v-chip>
                      <!-- <v-chip v-if="selectedRotationDay?.shift?.variants.length !== 0" value="TBD" color="onBackground" variant="flat" rounded="lg" size="small">
                        <v-icon start icon="mdi-clock-outline"></v-icon>
                        TBD
                      </v-chip> -->
                    </v-chip-group>
                  </div>
                </v-card-item>
              </v-card>
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
          </v-window-item>

          <!-- Deuxième fenêtre : Configuration des permutations et points -->
          <v-window-item :value="1">
            <v-progress-circular v-if="loadingRotations" indeterminate color="primary"
              class="ma-4"></v-progress-circular>
            <v-alert v-else-if="rotationError" type="error" variant="tonal" class="mt-2" rounded="lg">
              {{ rotationError }}
            </v-alert>
            <template v-else>
              <v-form ref="addForm" >
                <v-card color="transparent" class="my-12 pa-0" elevation="0">
                  <v-card-item class="">
                    <v-card-title class="pa-0 mb-0">
                      <h2 class="text-h6 font-weight-medium">Permutations acceptées</h2>
                    </v-card-title>
                    <v-card-subtitle class="pt-0 text-caption">Sélectionnez les vacations acceptées</v-card-subtitle>
                  </v-card-item>
                  <v-card-text class="">
                    <v-chip-group v-model="acceptedSwitches" multiple color="surface" :rules="[rules.rotations]">
                      <div v-for="day in rotationDays" :key="day._id" class="d-flex align-center">
                        <v-chip :value="day._id" class="ma-1" rounded="lg" variant="flat"
                          :class="isDayAvailable(day) ? '' : 'text-error'" base-color="transparent" color="transparent">
                          <template v-if="day.type === 'rest'">
                            <v-icon start icon="mdi-bed-outline"></v-icon>
                          </template>
                          <template v-if="!isDayAvailable(day)">
                            <v-tooltip activator="parent" location="top">
                              {{ getUnavailabilityReason(day) }}
                            </v-tooltip>
                          </template>
                          {{ day.name }}
                        </v-chip>
                      </div>
                    </v-chip-group>
                  </v-card-text>
                </v-card>

                <v-textarea rounded="xl" v-model="demand.comment" no-resize label="Commentaire" outlined></v-textarea>

                <v-card color="transparent" class="mt-4" elevation="0">
                  <v-card-title class="text-h6 font-weight-medium pa-0 mb-2">
                    Points par vacation
                  </v-card-title>
                  <v-card-subtitle class="text-caption pa-0 mb-4">
                    <span>Points par défaut : {{ selectedRotationDay?.shift?.defaultPoints }} </span>
                  </v-card-subtitle>
                  <v-card-subtitle class="text-caption pa-0 mb-4">
                    Définissez le nombre de points pour chaque vacation sélectionnée
                  </v-card-subtitle>
                  <div v-for="switchDay in acceptedSwitches" :key="switchDay" class="d-flex align-center mb-1">
                    <div class="d-flex align-center justify-space-between flex-grow-1">
                      <span class="text-body-1 mr-4">{{ getDayName(switchDay) }}</span>
                      <v-number-input v-model="pointsPerSwitch[switchDay]" class="text-primary secondary ml-4" reverse
                        :min="0" controlVariant="split" label="" rounded="xl" bg-color="surfaceContainer" color="blue"
                        glow :hideInput="false" inset base-color="transparent" variant="outlined"></v-number-input>
                    </div>
                  </div>
                </v-card>

                <div class="d-flex justify-start align-center mt-4" v-if="dialogMode !== 'switch'">
                  <v-number-input v-model="demand.points" class="text-primary" :class="{
                    'excess': demand.points > defaultPoints + 2,
                    'low': demand.points < defaultPoints - 2
                  }" :min="0" reverse controlVariant="split" label="" rounded="xl" bg-color="surfaceContainer"
                    color="blue" glow :hideInput="false" inset base-color="transparent" variant="outlined">


                  </v-number-input>

                </div>
              </v-form>
            </template>
          </v-window-item>
        </v-window>
      </v-card-text>

      <v-card-actions class="justify-space-between pa-0">
        <template v-if="currentWindow === 0">
          <v-btn variant="text" color="secondary" @click="close">Annuler</v-btn>
          <v-btn variant="tonal" rounded="xl" color="secondary" :disabled="isNextButtonDisabled"
            @click="currentWindow = 1">
            Suivant
          </v-btn>
        </template>
        <template v-else>
          <v-btn variant="text" color="secondary" @click="currentWindow = 0">Retour</v-btn>
          <v-btn variant="flat" rounded="xl" :color="dialogModeValue === 'switch' ? 'permutation' : 'remplacement'"
            :disabled="!formValid || !selectedVacation"
            @click="submit">
            Poster la demande
          </v-btn>
        </template>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <ConfirmationDialog :isDialogVisible="showConfirmationDialog" :title="'Nombre de points'"
    :text="'Êtes-vous sûr de vouloir poster une demande avec 0 point ?'" :confirmColor="'remplacement'"
    :confirmText="'Poster quand même'" @confirm="confirmSubmit"
    @update:isDialogVisible="showConfirmationDialog = $event" />
</template>

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
