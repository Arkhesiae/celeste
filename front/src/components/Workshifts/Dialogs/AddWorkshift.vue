<script setup>
  import { ref, computed, reactive, watch } from 'vue';
import { useDisplay } from 'vuetify';
import AddDayDialog from './AddOrEditDay.vue';
import WorkshiftSummary from '../Summary/WorkshiftSummary.vue';

const props = defineProps({
  isDialogVisible: {
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
  'update:dialogVisible', 
  'rotationEditSubmit', 
  'rotationEditCancel'
]);

const { smAndDown } = useDisplay();

const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:dialogVisible', value),
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
    currentWindow.value = 1; // Passer directement à la fenêtre de configuration des jours
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

const handleEditDay = (day) => {
  dayToEdit.value = { ...day }; // Créer une copie du jour à éditer
  showAddDayDialog.value = true;
};

const handleSubmitDay = (day) => {
  if (dayToEdit.value) {
    // Mode édition : remplacer le jour existant
    const index = newRotation.value.days.findIndex(d => d._id === dayToEdit.value._id);
    console.log(dayToEdit.value);
    console.log(newRotation.value.days);
    if (index !== -1) {
      newRotation.value.days[index] = day;
    }
    dayToEdit.value = null; // Réinitialiser après l'édition
  } else {
    // Mode ajout : ajouter un nouveau jour
    newRotation.value.days.push(day);
  }
  updateRestDayNames();
};

const handleAddRestDay = () => {
  newRotation.value.days.push({
    name: '', // Le nom sera calculé dynamiquement par la computed property
    type: 'rest',
    defaultPoints: 0
  });
  updateRestDayNames();
};

const handleRemoveDay = (index) => {
  newRotation.value.days.splice(index, 1);
  updateRestDayNames(); // Recalculer les noms des jours de repos
};

// Nouvelle fonction pour mettre à jour les noms des jours de repos
const updateRestDayNames = () => {
  newRotation.value.days.filter(day => day.type === 'rest').forEach((day, index) => {
    if (day.type === 'rest') {
      day.name = `R${index + 1}`; // Mettre à jour le nom avec l'index correct
    }
  });
};

const computeWorkDuration = (start, end) => {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  let endsNextDay = false;
  let startDate = new Date();
  startDate.setHours(startHour, startMinute);
  let endDate = new Date();
  endDate.setHours(endHour, endMinute);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
    endsNextDay = true;
  }

  const durationInMillis = endDate - startDate;
  const hours = Math.floor(durationInMillis / 3600000);
  const minutes = Math.floor((durationInMillis % 3600000) / 60000);
  return { duration: `${hours}h ${minutes}m`, endsNextDay };
};

const addDay = () => {
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
  localDialogVisible.value = false;
};
</script>

<template>
  <v-dialog v-model="localDialogVisible" max-width="900" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" elevation="0" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
       
        <v-card-title class="d-flex justify-space-between align-center">{{ props.rotation ? 'Modifier le TDS' : 'Ajouter un nouveau TDS' }}</v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>
      <v-card-text class="px-6">
        <v-window v-model="currentWindow" class="pt-1 pa-0" height="100">
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
                color="primary"
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
      </v-card-text>
      <v-card-actions v-if="currentWindow === 0" class="pa-6">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          @click="currentWindow = 1"
          :disabled="isNextButtonDisabled"
          size="large"
          :slim="false"
        >
          Suivant
        </v-btn>
      </v-card-actions>
      
      <div v-if="currentWindow === 1" class="pa-6 d-flex">
        <v-btn
          v-if="!props.rotation"
          color="primary"
          variant="text"
          rounded="xl"
          @click="currentWindow = 0"
          size="large"
          :slim="false"
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
          size="large"
          :slim="false"
        >
          {{ props.rotation ? 'Enregistrer les modifications' : 'Enregistrer' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- Add Day Dialog -->
  <AddOrEditDay
    :isDialogVisible="showAddDayDialog"
    :dayNumber="newRotation.days.filter(day => day.type === 'work').length + 1"
    :variants="variants"
    :day="dayToEdit"
    :mode="dayToEdit ? 'edit' : 'add'"
    @onSubmit="handleSubmitDay"
    @update:dialogVisible="showAddDayDialog = $event"
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
