<template>

  <GenericDialog max-width="900" v-model="dialogVisible" :title="dialogModeValue === 'Renfort' ? 'Programmer un renfort' : 'Changer d\'équipe'" :subtitle="dialogModeValue === 'Renfort' ? 'Sélectionnez la période de renfort' : 'Sélectionnez la date de changement'" :icon="dialogModeValue === 'Renfort' ? 'mdi-calendar-plus' : 'mdi-account-outline'" @close="close">
    <template #content>
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
                <v-select prepend-icon="mdi-account-outline" variant="outlined" class="mb-8" :items="teams"
                  :item-title="item => 'Equipe ' + item.name" v-model="selectedTeam" label="Equipe" single-line
                  item-value="_id" :rules="[rules.required]" bg-color="surface" rounded="lg"></v-select>
              </v-col>
            </v-row>
          </v-window-item>

          <!-- Deuxième fenêtre - Sélection de la date -->
          <v-window-item :value="1">
            <v-row>
              <v-col cols="12" md="6">
                <v-card-item class="pa-0 mb-6">
                  <span class="text-overline font-weight-medium">Equipe {{ selectedTeamName }}</span>
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
                  <v-card color="background" class="mb-8 pa-4" rounded="xl" elevation="0">
                    <v-card-item>
                      <div class="d-flex justify-space-between align-center">
                        <v-card-title class="text-subtitle-1 font-weight-medium">
                          {{ dialogModeValue === 'Renfort' ? 'Période de renfort' : 'Date de changement' }}
                        </v-card-title>
                        <v-chip v-if="selectedDates.startDate" class="ml-4" color="onBackground" size="small"
                          rounded="lg">
                          {{ dialogModeValue === 'Renfort' ? `${numberOfDays} jour${numberOfDays > 1 ? 's' : ''}` :
                            relativeDaysText }}
                        </v-chip>
                      </div>
                    </v-card-item>

                    <v-card-text>
                      <div class="text-body-2">
                        <v-slide-y-transition mode="out-in">


                          <template v-if="!selectedDates.startDate">
                            <span v-if="dialogModeValue === 'Renfort'">Sélectionnez la période de renfort</span>
                            <span v-else>Sélectionnez la date de changement</span>
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
                                  <span class="d-inline-block "> &nbsp;{{ toDisplayFormat(selectedDates.endDate)
                                  }}</span>
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
              <v-col cols="12" md="6" class="pa-4">
                <v-slide-y-transition>
                  <v-alert v-if="conflict" color="error" type="warning" rounded="lg" variant="tonal" class="mt-4">

                    <v-card-title class="pa-0 ma-0">Conflit</v-card-title>
                    <v-card-text class="pa-0 ma-0">
                      <p class="opacity-50">Vous avez déjà un changement prévu pour le {{
                        toDisplayFormat(conflict.fromDate)
                        }} dans l'équipe <strong>{{ conflict.teamName }}</strong></p>

                    </v-card-text>


                  </v-alert>
                  <v-alert v-if="enRenfortConflict" color="error" type="warning" rounded="lg" variant="tonal" class="mt-4">

                    <v-card-title class="pa-0 ma-0">Renfort déjà prévu</v-card-title>
                    <v-card-text class="pa-0 ma-0">
                      <p class="opacity-50">Vous avez déjà un renfort prévu entre le {{
                        toDisplayFormat(enRenfortConflict.fromDate) }} et le {{
                        toDisplayFormat(enRenfortConflict.toDate) }}
                        dans l'équipe <strong>{{ enRenfortConflict.teamName }}</strong></p>

                    </v-card-text>


                  </v-alert>
                </v-slide-y-transition>
              </v-col>
              <v-col cols="12" md="6"> <v-date-picker hide-header class="mx-auto mt-4" elevation="0" width="100%"
                  max-width="600px" :min="new Date().toISOString().split('T')[0]"
                  :multiple="dialogModeValue === 'Renfort' ? 'range' : false" v-model="pickerDates"
                  @update:model-value="updateFormattedDate" locale="fr"></v-date-picker></v-col>
            </v-row>


          </v-window-item>
        </v-window>
    </template>
    <template #actions>
    
      
        <v-btn v-if="currentWindow === 0" color="primary" variant="tonal" rounded="xl" @click="currentWindow = 1" :disabled="!selectedTeam">
          Suivant
        </v-btn>
   


        <v-btn v-if="currentWindow === 1" color="primary" variant="tonal" :disabled="!formValid" rounded="xl" @click="handleTeamChange">
          Valider
        </v-btn>
    
    </template>
    <template #footer>  
      <div v-if="currentWindow === 0" class="pa-0 ma-0 d-flex flex-grow-1">
        <v-spacer></v-spacer>
        <v-btn class="flex-shrink-0" color="primary" variant="tonal" rounded="xl" @click="currentWindow = 1" :disabled="!selectedTeam">
          Suivant
        </v-btn>
      </div>

      <!-- Actions pour la deuxième fenêtre -->
      <div v-if="currentWindow === 1" class="pa-0 ma-0 d-flex flex-grow-1">
        <v-btn color="primary" variant="text" rounded="xl" @click="currentWindow = 0">
          Retour
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn color="primary" variant="tonal" :disabled="!formValid" rounded="xl" @click="handleTeamChange">
          Valider
        </v-btn>
      </div>
    </template>
  </GenericDialog>






  <!-- <v-dialog v-model="localDialogVisible" max-width="900" :fullscreen="smAndDown">
    <v-card :rounded="smAndDown ? '' : 'xl'" class="pa-0 pt-6">
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
      

      </v-card-text>

     Actions pour la première fenêtre 
     
   </v-card>
  </v-dialog> --> 

  <!-- Confirmation Dialog -->
  <v-dialog v-model="showConfirmationDialog" max-width="400px">
    <v-card rounded="xl" elevation="0" class="pa-2">
      <v-card-item prepend-icon="mdi-alert-outline">
        <v-card-title>Conflit de changement</v-card-title>
      </v-card-item>

      <v-card-text class="opacity-50">
        Vous avez déjà un changement prévu dans l'équipe <strong>{{ conflict?.teamName || '?' }}</strong> pour le <strong>{{ toDisplayFormat(conflict?.fromDate) || '?' }}</strong>.
        Ecraser le changement ?
      </v-card-text>
      <v-card-actions class="justify-space-between">
        <v-btn variant="text" color="secondary" rounded="xl" @click="showConfirmationDialog = false">
          Annuler
        </v-btn>
        <v-btn variant="tonal" rounded="xl" color="primary" @click="overrideDateConflict">
          Valider
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showConflictDialog" max-width="600px">
    <v-card rounded="xl" elevation="0" class="pa-6">
      <v-card-item prepend-icon="mdi-alert-outline" class="pa-0 ma-0">
        <v-card-title>Conflits détectés</v-card-title>
      </v-card-item>
      <v-card-text class="pa-0 my-4 ma-0">
        <div v-if="substitutionConflicts.length">
          <p>Les demandes suivantes sont impactées par le changement d'équipe / annulation et seront annulées :</p>
          <v-list class="pa-0 ga-3 my-2 d-flex flex-column">
       
                <v-card  v-for="(conf, idx) in substitutionConflicts" :key="idx" color="background" class="pa-4" rounded="xl" elevation="0">
                <v-list-item-title>
                  Demande du {{ toDisplayFormat(conf.sub?.posterShift?.date) }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  Demande initiale : <strong>{{ conf.sub?.posterShift?.name }}</strong> → après changement : <strong>{{ conf.newShift?.name }}</strong>
                </v-list-item-subtitle>
              </v-card>
        
          </v-list>
        </div>
      </v-card-text>
      <v-card-actions class="justify-space-between">
        <v-btn variant="text" color="secondary" rounded="xl" @click="showConflictDialog = false">
          Annuler
        </v-btn>
        <v-btn variant="tonal" rounded="xl" color="primary" @click="handleDeleteAndSubmit">
          Valider et annuler les demandes
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDisplay } from 'vuetify';
import { useDate } from 'vuetify';
import { toUTCNormalized } from "@/utils.js";
import { useTeamStore } from "@/stores/teamStore";
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useAuthStore } from '@/stores/authStore';
import { vacationService } from '@/services/vacationService';
import { substitutionService } from '@/services/substitutionService';

const props = defineProps({
  dialogMode: {
    type: String,
    required: true,
  },
  modelValue: {
    type: Boolean,
    required: true,
  },

});

const emit = defineEmits(["onClose", "onSubmit", "update:dialogMode", "update:modelValue"]);

const date = useDate();
const teamStore = useTeamStore();
const teams = computed(() => teamStore.centerTeams);
const substitutionStore = useSubstitutionStore();
const authStore = useAuthStore();
const userId = computed(() => authStore.userData.userId);

const dialogModeValue = computed({
  get: () => props.dialogMode,
  set: (value) => emit("update:dialogMode", value),
});

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const currentWindow = ref(0);
const showConfirmationDialog = ref(false);
const selectedTeam = ref(null);
const pickerDates = ref(null);
const formattedStartDate = ref('');
const formattedEndDate = ref('');
const formattedDate = ref('');
const formValid = ref(false);
const showConflictDialog = ref(false);
const substitutionConflicts = ref([]);
const substitutions = computed(() => {
    return substitutionStore.substitutions;
});


const ownDemands = computed(() => {
  return substitutionStore.substitutions.filter(sub => sub.posterId === userId.value);
});

const acceptedAsAccepter = computed(() => {
  return substitutionStore.acceptedAsAccepter;
});

const selectedTeamName = computed(() => {
  const team = teams.value.find(t => t._id === selectedTeam.value);
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

// const enRenfort = computed(() => {
//   if (!selectedDates.value.startDate || !props.occurrences?.allOccurrences) return null;
//   const now = new Date(toUTCNormalized(selectedDates.value.startDate));
//   return props.occurrences?.allOccurrences.find((occurrence) => {
//     const startDate = new Date(occurrence.fromDate);
//     const endDate = occurrence.toDate ? new Date(occurrence.toDate) : null;
//     return startDate <= now && endDate >= now;
//   }) || null;
// });

const enRenfortConflict = computed(() => {
  if (!selectedDates.value.startDate || !selectedDates.value.endDate || !teamStore.teamOccurrences?.allOccurrences) return null;
  const startOfRenfort = new Date(toUTCNormalized(selectedDates.value.startDate));
  const endOfRenfort = new Date(toUTCNormalized(selectedDates.value.endDate));
  return teamStore.teamOccurrences?.allOccurrences.find((occurrence) => {
    const startDate = new Date(occurrence.fromDate);
    const endDate = occurrence.toDate ? new Date(occurrence.toDate) : null;
    return startDate <= startOfRenfort && endDate >= startOfRenfort || startDate <= endOfRenfort && endDate >= endOfRenfort;
  }) || null;
});

const conflict = computed(() => {
  if (!selectedDates.value.startDate || !teamStore.teamOccurrences?.allOccurrences || props.dialogMode === 'Renfort')  return null;
  return teamStore.teamOccurrences?.allOccurrences.find(
    (occurrence) => toUTCNormalized(occurrence.fromDate) === toUTCNormalized(selectedDates.value.startDate) && !occurrence.toDate
  ) || null;
});

const isFormValid = computed(() => {
  return !!selectedTeam.value && selectedDates.value.startDate && !enRenfortConflict.value;
});

watch(isFormValid, (newVal) => {
  formValid.value = newVal;
});

async function detectSubstitutionConflicts() {
  // Appel à l'API backend pour détecter les conflits
  const fromDate = toUTCNormalized(selectedDates.value.startDate);
  const newTeamId = selectedTeam.value;
  const params = {
    userId: userId.value,
    newTeamId,
    fromDate
  };
  try {
    const result = await substitutionService.detectTeamChangeConflicts(params);
    // On récupère les IDs des substitutions conflictuelles
    const conflicts = result.conflicts || [];

    // On filtre les substitutions locales pour afficher les infos dans la modale
    const allSubs = [
      ...ownDemands.value,
      ...acceptedAsAccepter.value
    ];

    conflicts.forEach(conflict => {
      const sub = allSubs.find(sub => sub._id === conflict.id);
      conflict.sub = sub;
    });

  
    substitutionConflicts.value = conflicts;
    return conflicts;
  } catch (e) {
    substitutionConflicts.value = [];
    return [];
  }
}

const handleTeamChange = async () => {
  checkDateConflict()
};

const checkDateConflict = () => {
  if (conflict.value && dialogModeValue.value !== 'Renfort') {
    showConfirmationDialog.value = true;
  } 
  else checkSubstitutionConflict()
}

const overrideDateConflict = () => {
  showConfirmationDialog.value = false;
  checkSubstitutionConflict()
}

const checkSubstitutionConflict = async () => { 
  const conflicts = await detectSubstitutionConflicts();
  if (conflicts.length > 0) {
    showConflictDialog.value = true;
    return;
  } 
  
  else handleSubmit()
}

const handleDeleteAndSubmit = async () => {
  showConflictDialog.value = false;
  // DELETE THE CONFLICT
  console.log("conflicts", substitutionConflicts.value);
  for (const conflict of substitutionConflicts.value) {
    await substitutionService.cancelDemand(conflict.id);
  }
  handleSubmit()
}

const handleSubmit = () => {
  const teamData = {
    teamId: selectedTeam.value,
    fromDate: toUTCNormalized(selectedDates.value.startDate),
    toDate: dialogModeValue.value === 'Renfort' ? toUTCNormalized(selectedDates.value.endDate) : null
  };
  submit(teamData, conflict.value);
};

const submit = (teamData, conflictToReplace) => {
  if (formValid.value) {
    emit("onSubmit", teamData, conflictToReplace);
  }
  resetForm()
};

const resetForm = () => {
  selectedTeam.value = null;
  pickerDates.value = null;
  currentWindow.value = 0;
  formValid.value = false;
}

const close = () => {
  dialogVisible.value = false;
  resetForm()
};



</script>

<style scoped>
.v-btn {
  text-transform: none;
  letter-spacing: 0;
}

.v-chip {
  font-weight: 500;
}
</style>
