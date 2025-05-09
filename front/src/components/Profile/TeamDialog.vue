<template>
  <v-dialog v-model="localDialogVisible" max-width="900" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" elevation="0" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
          {{ dialogModeValue === 'Renfort' ? 'Programmer un renfort' : 'Changer d\'équipe' }}
        </v-card-title>
        <template #append v-if="!smAndDown">
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
        <template #prepend v-else>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="py-0 px-6">
        <v-window v-model="currentWindow" class="pt-1 pa-0" height="100">
          <!-- Première fenêtre - Sélection de l'équipe -->
          <v-window-item :value="0">
            <v-row>
              <v-col cols="12" md="6">
                <v-card-item class="pa-0 mb-6">
                  <v-card-subtitle class="text-medium-emphasis">
                    Sélectionnez l'équipe pour votre {{ dialogModeValue === 'Renfort' ? 'renfort' : 'changement' }}
                  </v-card-subtitle>
                </v-card-item>
              </v-col>
              <v-col cols="12" md="6">
                <v-select 
                  prepend-icon="mdi-account-outline" 
                  variant="outlined" 
                  class="mb-8" 
                  :items="teams" 
                  item-title="name"
                  v-model="selectedTeam"
                  label="Equipe"
                  single-line
                  item-value="_id" 
                  :rules="[rules.required]"
                  bg-color="surface"
                  rounded="lg"
                ></v-select>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Deuxième fenêtre - Sélection de la date -->
          <v-window-item :value="1">
            <v-row>
              <v-col cols="12" md="6">
                <v-card-item class="pa-0 mb-6">
                  <span class="text-overline font-weight-medium">{{ selectedTeamName }}</span>
                  <v-card-title class="d-flex justify-space-between align-center">
                    <div class="text-h5 font-weight-medium">Configuration des dates</div>
                  </v-card-title>
                  <v-card-subtitle class="text-medium-emphasis">
                    {{ dialogModeValue === 'Renfort' ? 'Sélectionnez la période de renfort' : 'Sélectionnez la date de changement' }}
                  </v-card-subtitle>
                </v-card-item>
              </v-col>
              <v-col cols="12" md="6">
                <v-fade-transition>
                  <v-card  color="background" class="mb-8 pa-4" rounded="xl" elevation="0">
                    <v-card-item>
                      <div class="d-flex justify-space-between align-center">
                        <v-card-title class="text-subtitle-1 font-weight-medium">
                          {{ dialogModeValue === 'Renfort' ? 'Période de renfort' : 'Date de changement' }}
                        </v-card-title>
                        <v-chip
                          v-if="selectedDates.startDate"
                          class="ml-4"
                          color="onBackground"
                          size="small"
                          rounded="lg"
                        >
                          {{ dialogModeValue === 'Renfort' ? `${numberOfDays} jour${numberOfDays > 1 ? 's' : ''}` : relativeDaysText }}
                        </v-chip>
                      </div>
                    </v-card-item>
              
                    <v-card-text>
                      <div class="text-body-2">
                        <v-slide-y-transition mode="out-in">

                
                        <template v-if="!selectedDates.startDate">
                          <span>Sélectionnez la période de renfort</span>
                        </template>
                        <template v-else>
                          <div class="d-flex align-center flex-wrap">
                            <span class="d-inline-block">{{ dialogModeValue === 'Renfort' ? 'Du' : 'Le' }}</span>
                            <v-fade-transition>
                              <span v-if="selectedDates.startDate" class="d-inline-block">
                                &nbsp;{{ toDisplayFormat(selectedDates.startDate) }}&nbsp;
                              </span>
                            </v-fade-transition>
                            <v-fade-transition>
                              <div v-if="dialogModeValue === 'Renfort' && selectedDates.endDate">
                                <span class="d-inline-block">au</span>
                                <span class="d-inline-block "> &nbsp;{{ toDisplayFormat(selectedDates.endDate) }}</span>
                              </div>
                            </v-fade-transition>
                          </div>
                        </template>
                      </v-slide-y-transition>
                      </div>
                    </v-card-text>
                
                  </v-card>
                </v-fade-transition>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6" class="pa-0">
                
              </v-col>
              <v-col cols="12" md="6"> <v-date-picker
              hide-header
              class="mx-auto mt-4"
              elevation="0"
              width="100%"
              max-width="600px"
              :min="new Date().toISOString().split('T')[0]"
              :multiple="dialogModeValue === 'Renfort' ? 'range' : false"
              v-model="pickerDates"
              @update:model-value="updateFormattedDate"
              locale="fr"
            ></v-date-picker></v-col>
            </v-row>

           
          </v-window-item>
        </v-window>
      </v-card-text>

      <!-- Actions pour la première fenêtre -->
      <v-card-actions v-if="currentWindow === 0" class="pa-6">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          rounded="xl"
          @click="currentWindow = 1"
          :disabled="!selectedTeam"
          size="large"
          :slim="false"
        >
          Suivant
        </v-btn>
      </v-card-actions>
      
      <!-- Actions pour la deuxième fenêtre -->
      <div v-if="currentWindow === 1" class="pa-6 d-flex">
        <v-btn
          color="primary"
          variant="text"
          rounded="xl"
          @click="currentWindow = 0"
          :slim="false"
          size="large"
        >
          Retour
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="tonal"
          :slim="false"
          :disabled="!formValid"
          rounded="xl"
          @click="handleAddTeam"
          size="large"
        >
          Valider
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <!-- Confirmation Dialog -->
  <v-dialog v-model="showConfirmationDialog" max-width="400px">
    <v-card rounded="xl" elevation="0" class="pa-2">
      <v-card-item prepend-icon="mdi-alert-outline">
        <v-card-title>Conflit de changement</v-card-title>
      </v-card-item>

      <v-card-text>
        Ecraser le changement du {{ toDisplayFormat(pickerDates[0]) }} ?
      </v-card-text>
      <v-card-actions class="justify-space-between">
        <v-btn variant="text" color="secondary" @click="showConfirmationDialog = false">Annuler</v-btn>
        <v-btn variant="tonal" rounded="lg" color="primary" @click="submit() ; showConfirmationDialog=false">Valider</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { useDate } from 'vuetify';
import { toUTCNormalized } from "@/utils.js";

const props = defineProps({
  dialogMode: {
    type: String,
    required: true,
  },
  dialogVisible: {
    type: Boolean,
    required: true,
  },
  teams: {
    type: Array,
    required: true,
  },
  occurrences: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["onClose", "onSubmit", "update:dialogModeValue", "update:dialogVisible"]);

const { smAndDown } = useDisplay();
const date = useDate();

const dialogModeValue = computed({
  get: () => props.dialogMode,
  set: (value) => emit("update:dialogModeValue", value),
});

const localDialogVisible = computed({
  get: () => props.dialogVisible,
  set: (value) => emit("update:dialogVisible", value),
});

const currentWindow = ref(0);
const showConfirmationDialog = ref(false);
const selectedTeam = ref(null);
const pickerDates = ref(null);
const formattedStartDate = ref('');
  const formattedEndDate = ref('');
const formattedDate = ref('');
const formValid = ref(false);

const selectedTeamName = computed(() => {
  const team = props.teams.find(t => t._id === selectedTeam.value);
  return team ? team.name : '';
});

const numberOfDays = computed(() => {
  if (dialogModeValue.value !== 'Renfort' || !selectedDates.value.startDate || !selectedDates.value.endDate) return 0;
  const start = new Date(selectedDates.value.startDate);
  const end = new Date(selectedDates.value.endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
});

const relativeDays = computed(() => {
  if (dialogModeValue.value !== 'Changement' || !selectedDates.value.startDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const changeDate = new Date(selectedDates.value.startDate);
  const diffTime = changeDate - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

const relativeDaysText = computed(() => {
  if (dialogModeValue.value !== 'Changement' || !selectedDates.value.startDate) return '';
  const days = relativeDays.value;
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Demain";
  if (days > 0) return `Dans ${days} jours`;
  return `Il y a ${Math.abs(days)} jours`;
});

const selectedDates = computed(() => {
  if (Array.isArray(pickerDates.value)) {
    return {
      startDate: pickerDates.value[0] || null,
      endDate: pickerDates.value.length > 1 ? pickerDates.value[pickerDates.value.length - 1] : null
    };
  }
  return { startDate: pickerDates.value };
});

const rules = {
  required: (value) => !!value || "Ce champ est requis.",
};


const toDisplayFormat = (input) => {
  if (input) {
    return date.format(input, "fullDate");
  }
};

const updateFormattedDate = (val) => {
  pickerDates.value = val;
  if (Array.isArray(val)) {
    formattedStartDate.value = date.format(val[0], "fullDate");
    formattedEndDate.value = val.length > 1 ? date.format(val[val.length - 1], "fullDate") : '';
  } else {
    formattedDate.value = date.format(val, "fullDate");
  }
};

const enRenfort = computed(() => {
  if (!selectedDates.value.startDate || !props.occurrences?.allOccurrences) return null;
  const now = new Date(toUTCNormalized(selectedDates.value.startDate));
  return props.occurrences?.allOccurrences.find((occurrence) => {
    const startDate = new Date(occurrence.fromDate);
    const endDate = occurrence.toDate ? new Date(occurrence.toDate) : null;
    return startDate <= now && endDate >= now;
  }) || null;
});

const enRenfortConflict = computed(() => {
  if (!selectedDates.value.startDate || !selectedDates.value.endDate || !props.occurrences?.allOccurrences) return null;
  const startOfRenfort = new Date(toUTCNormalized(selectedDates.value.startDate));
  const endOfRenfort = new Date(toUTCNormalized(selectedDates.value.endDate));
  return props.occurrences?.allOccurrences.find((occurrence) => {
    const startDate = new Date(occurrence.fromDate);
    const endDate = occurrence.toDate ? new Date(occurrence.toDate) : null;
    return startDate <= startOfRenfort && endDate >= startOfRenfort || startDate <= endOfRenfort && endDate >= endOfRenfort;
  }) || null;
});

const conflict = computed(() => {
  if (!selectedDates.value.startDate || !props.occurrences?.allOccurrences) return null;
  return props.occurrences?.allOccurrences.find(
    (teame) => teame.fromDate === toUTCNormalized(selectedDates.value.startDate) && !teame.toDate
  ) || null;
});

const isFormValid = computed(() => {
  return !!selectedTeam.value && !enRenfortConflict.value;
});

watch(isFormValid, (newVal) => {
  formValid.value = newVal;
});

watch(() => props.dialogVisible, (value) => {
  if (!value) {
    selectedTeam.value = null;
    pickerDates.value = null;
    currentWindow.value = 0;
    formValid.value = false;
  }
});

const handleAddTeam = async () => {
  const teamData = {
    teamId: selectedTeam.value,
    fromDate: toUTCNormalized(selectedDates.value.startDate),
    toDate: dialogModeValue.value === 'Renfort' ? toUTCNormalized(selectedDates.value.endDate) : null
  };

  if (conflict.value && dialogModeValue.value !== 'Renfort') {
    showConfirmationDialog.value = true;
  } else {
    submit(teamData);
  }
};

const submit = (teamData) => {
  if (formValid.value) {
    emit("onSubmit", teamData, conflict.value);
  }
};

const close = () => {
  localDialogVisible.value = false;
};
</script>

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
