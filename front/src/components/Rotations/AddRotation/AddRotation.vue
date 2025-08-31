<script setup>
  import { ref, computed, reactive, watch } from 'vue';
import { useDisplay } from 'vuetify';
import WorkshiftSummary from './WorkshiftSummary.vue';
import GenericDialog from '../../Dialogs/GenericDialog.vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  rotation : {
    type: Object,
    default: null
  }
});

const emit = defineEmits([
  'rotationSubmit', 
  'update:modelValue', 
  'rotationEditSubmit', 
  'rotationEditCancel',
  'close'
]);

const { smAndDown } = useDisplay();

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const newRotation = ref({
  name: '',
  centerId: null,
  days: [],
});

const currentWindow = ref(0);

// Initialiser les données si on est en mode édition
watch(() => props.rotation, (newValue) => {
  if (newValue) {
    newRotation.value = { ...newValue };
    console.log("newRotation.value", newRotation.value);
    currentWindow.value = 0; // Passer directement à la fenêtre de configuration des jours
  } else {
    // Réinitialiser le formulaire si on ferme le dialogue
    newRotation.value = {
      name: '',
      centerId: null,
      days: [],
    };
    currentWindow.value = 0;
  }
}, { immediate: true });

const nameRules = [
  v => !!v || 'Le nom est requis',
];

const isNextButtonDisabled = computed(() => {
  return !newRotation.value.name;
});

const variants = ref(['A', 'B', 'C']);
const showAddDayDialog = ref(false);
const isSummaryExpanded = ref(true);
const dayToEdit = ref(null);
const dayToEditIndex = ref(null);

const handleEditDay = (day) => {
  dayToEditIndex.value = newRotation.value.days.indexOf(day);
  dayToEdit.value = { ...day }; // Créer une copie du jour à éditer
  showAddDayDialog.value = true;
};

const handleSubmitDay = (day) => {
  if (dayToEdit.value) {
    if (dayToEditIndex.value !== -1) {
      newRotation.value.days[dayToEditIndex.value] = day;
    }
    dayToEdit.value = null; // Réinitialiser après l'édition
  } else {
    newRotation.value.days.push(day);
  }
  updateRestDayNames();
  updateOrder();
};

const updateOrder = () => {
  newRotation.value.days.forEach((day, index) => {
    day.order = index + 1;
  });
};

const handleAddRestDay = () => {
  newRotation.value.days.push({
    name: '', // Le nom sera calculé dynamiquement par la computed property
    type: 'rest',
    default: {
      points: 0,
      startTime: null,
      endTime: null,
      endsNextDay: false
    }
  });
  updateRestDayNames();
  updateOrder();
};

const handleRemoveDay = (index) => {
  newRotation.value.days.splice(index, 1);
  updateRestDayNames(); // Recalculer les noms des jours de repos
  updateOrder();
};

// Nouvelle fonction pour mettre à jour les noms des jours de repos
const updateRestDayNames = () => {
  newRotation.value.days.filter(day => day.type === 'rest').forEach((day, index) => {
    if (day.type === 'rest') {
      day.name = `R${index + 1}`; // Mettre à jour le nom avec l'index correct
    }
  });
};

const addDay = () => {
  if (dayToEdit.value) {
    dayToEdit.value = null;
  }
  showAddDayDialog.value = true;
};

const submit = () => {
  if (props.rotation) {
    // Mode édition
    emit('rotationEditSubmit', {
      ...newRotation.value,
      _id: props.rotation._id,
      centerId: props.rotation.centerId,
      days: newRotation.value.days,
    });
  } else {
    // Mode création
    emit('rotationSubmit', {
      name: newRotation.value.name,
      centerId: null,
      days: newRotation.value.days,
    });
  }
  localDialogVisible.value = false;
};

const close = () => {
  if (props.rotation) {
    emit('rotationEditCancel');
  }
  emit('close');
  localDialogVisible.value = false;
};
</script>

<template>
  <GenericDialog
    v-model="localDialogVisible"
    :title="props.rotation ? 'Modifier le TDS' : 'Ajouter un nouveau TDS'"
    max-width="900"
    @close="close"
  >
    <template #content>
      <v-window v-model="currentWindow" class="pt-1 pa-0" >
        <!-- Première fenêtre -->
        <v-window-item :value="0">
          <v-row>
            <v-col cols="12" md="6">
              <v-card-item class="pa-0 mb-6">
                <v-card-subtitle class="text-medium-emphasis">
                  Configurez les vacations et les périodes de repos pour votre tour de service
                </v-card-subtitle>
              </v-card-item>
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="newRotation.name"
                label="Nom du tour de service"
                variant="outlined"
                class="mb-8"
                bg-color="surface"
                rounded="lg"
                :rules="nameRules"
                placeholder="Ex: Tour de service principal"
              ></v-text-field>
            </v-col>
          </v-row>
        </v-window-item>

        <!-- Deuxième fenêtre -->
        <v-window-item :value="1">
          <v-row>
            <v-col cols="12" md="6">
              <v-card-item class="pa-0 mb-6">
                <span class="text-overline font-weight-medium">{{ newRotation.name }}</span>
                <v-card-title class="d-flex justify-space-between align-center">
                  <div class="text-h5 font-weight-medium">Configuration des jours</div>
                </v-card-title>
                <v-card-subtitle class="text-medium-emphasis">
                  {{ props.rotation ? 'Modifiez les vacations et les périodes de repos' : 'Ajoutez les vacations et les périodes de repos pour votre tour de service' }}
                </v-card-subtitle>
              </v-card-item>
            </v-col>
            <v-col cols="12" md="6">
              <!-- Résumé schématique -->
              <v-fade-transition>
                <v-card v-if="newRotation.days.length > 0" color="background" class="mb-8 pa-4" rounded="xl" elevation="0">
                  <v-card-item>
                    <div class="d-flex justify-space-between align-center">
                      <v-card-title class="text-subtitle-1 font-weight-medium">Tour de service</v-card-title>
                      <v-chip
                        class="ml-4"
                        color="onBackground"
                        size="small"
                        rounded="lg"
                      >
                        {{ newRotation.days.length }} jour{{ newRotation.days.length > 1 ? 's' : '' }}
                      </v-chip>
                      <v-btn
                        icon
                        variant="text"
                        @click="isSummaryExpanded = !isSummaryExpanded"
                      >
                        <v-icon>{{ isSummaryExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
                      </v-btn>
                    </div>
                  </v-card-item>
                  <WorkshiftSummary
                    :days="newRotation.days"
                    :isExpanded="isSummaryExpanded"
                    @onDeleteDay="handleRemoveDay"
                    @onEditDay="handleEditDay"
                  />
                </v-card>
              </v-fade-transition>
            </v-col>
          </v-row>
          <div class="d-flex"
            :class="smAndDown ? 'justify-space-between flex-column' : 'justify-end'"
          >
            <v-btn
              color="onBackground"
              prepend-icon="mdi-plus"
              @click="addDay"
              class=""
              :rounded="smAndDown ? 'xl' : 'lg'"
              :height="smAndDown ? 48 : 36"
              :block="smAndDown"
            >
              Ajouter une vacation
            </v-btn>

            <v-btn
              color="secondary"
              :class="!smAndDown ? 'ml-2' : 'mt-2'"
              variant="tonal"
              prepend-icon="mdi-sleep"
              @click="handleAddRestDay"
              :rounded="smAndDown ? 'xl' : 'lg'"
              :height="smAndDown ? 48 : 36"
              :block="smAndDown"
            >
              Ajouter un repos
            </v-btn>
          </div>
        </v-window-item>
      </v-window>
    </template>

    <template #footer>
      <div v-if="currentWindow === 0" class="pa-0 ma-0 d-flex flex-grow-1">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          @click="currentWindow = 1"
          :disabled="isNextButtonDisabled"
        >
          Suivant
        </v-btn>
      </div>
      
      <div v-if="currentWindow === 1" class="pa-0 ma-0 d-flex flex-grow-1">
        <v-btn
          v-if="!props.rotation"
          color="primary"
          variant="text"
          rounded="xl"
          @click="currentWindow = 0"
        >
          Retour
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          :disabled="newRotation.days.length === 0"
          @click="submit"
        >
          {{ props.rotation ? 'Enregistrer les modifications' : 'Enregistrer' }}
        </v-btn>
      </div>
    </template>
  </GenericDialog>

  <!-- Add Day Dialog -->
  <AddOrEditDay
    :modelValue="showAddDayDialog"
    :dayNumber="newRotation.days.filter(day => day.type === 'work').length + 1"
    :day="dayToEdit"
    :mode="dayToEdit ? 'edit' : 'add'"
    @onSubmit="handleSubmitDay"
    @update:modelValue="showAddDayDialog = $event"
  />
</template>

<style scoped>
.v-card {
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.12);
}

.v-btn {
  text-transform: none;
  letter-spacing: 0;
}

.v-chip {
  font-weight: 500;
}
</style>
