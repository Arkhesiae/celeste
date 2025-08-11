<template>
  <v-dialog
    v-model="isDialogVisible"
    :max-width="smAndDown ? '95%' : '600px'"
    persistent
  >
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>{{ dialogTitle }}</span>
        <v-btn icon @click="closeDialog">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-form ref="form" v-model="formValid">
          <!-- Type de modification -->
          <v-select
            v-model="modification.type"
            :items="modificationTypes"
            item-title="label"
            item-value="value"
            label="Type de modification"
            :rules="[rules.required]"
            required
            @update:model-value="onTypeChange"
          />

          <!-- Date -->
          <v-date-picker
            v-model="modification.date"
            :min="minDate"
            :max="maxDate"
            label="Date"
            :rules="[rules.required]"
            required
            @update:model-value="onDateChange"
          />

          <!-- Heures (optionnel selon le type) -->
          <div v-if="showTimeFields">
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="modification.startTime"
                  label="Heure de début"
                  type="time"
                  :rules="timeRules"
                  placeholder="HH:MM"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="modification.endTime"
                  label="Heure de fin"
                  type="time"
                  :rules="timeRules"
                  placeholder="HH:MM"
                />
              </v-col>
            </v-row>
          </div>

          <!-- Commentaire -->
          <v-textarea
            v-model="modification.comment"
            label="Commentaire (optionnel)"
            :rules="[rules.maxLength]"
            :maxlength="500"
            :counter="500"
            rows="3"
            auto-grow
          />

          <!-- Avertissement sur les conflits -->
          <v-alert
            v-if="hasConflicts"
            type="warning"
            variant="tonal"
            class="mt-3"
          >
            <strong>Attention :</strong> Vous avez des demandes de substitution ou êtes impliqué dans une substitution pour cette date. 
            Les modifications de planning ne peuvent pas être créées dans ce cas.
          </v-alert>

          <!-- Informations sur la modification -->
          <v-alert
            v-if="modificationInfo"
            :type="modificationInfo.type"
            variant="tonal"
            class="mt-3"
          >
            {{ modificationInfo.message }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn
          color="grey"
          variant="text"
          @click="closeDialog"
          :disabled="loading"
        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          @click="submitModification"
          :loading="loading"
          :disabled="!formValid || hasConflicts"
        >
          {{ submitButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useDisplay, useDate } from 'vuetify';
import { usePlanningModificationStore } from '@/stores/planningModificationStore';
import { useAuthStore } from '@/stores/authStore';
import { useCenterStore } from '@/stores/centerStore';

const props = defineProps({
  dialogVisible: { type: Boolean, required: true },
  date: { type: String },
  centerId: { type: String }
});

const emit = defineEmits([
  'onClose',
  'onSubmit',
  'update:dialogVisible'
]);

// Stores et utilitaires
const { smAndDown } = useDisplay();
const dateUtil = useDate();
const planningModificationStore = usePlanningModificationStore();
const authStore = useAuthStore();
const centerStore = useCenterStore();

// Références
const form = ref(null);
const formValid = ref(false);
const loading = ref(false);
const hasConflicts = ref(false);

// États du composant
const modification = ref({
  type: '',
  date: props.date || '',
  startTime: '',
  endTime: '',
  comment: '',
  centerId: props.centerId || authStore.centerId
});

// Types de modifications disponibles
const modificationTypes = [
  { label: 'Absence', value: 'absence' },
  { label: 'Jour de congé', value: 'off_day' },
  { label: 'Modification personnalisée', value: 'custom_modification' }
];

// Règles de validation
const rules = {
  required: v => !!v || 'Ce champ est requis',
  maxLength: v => !v || v.length <= 500 || 'Le commentaire ne peut pas dépasser 500 caractères'
};

const timeRules = [
  v => !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v) || 'Format d\'heure invalide (HH:MM)'
];

// Computed properties
const isDialogVisible = computed({
  get: () => props.dialogVisible,
  set: (value) => emit('update:dialogVisible', value)
});

const dialogTitle = computed(() => {
  switch (modification.value.type) {
    case 'absence':
      return 'Déclarer une absence';
    case 'off_day':
      return 'Déclarer un jour de congé';
    case 'custom_modification':
      return 'Modification personnalisée';
    default:
      return 'Nouvelle modification de planning';
  }
});

const showTimeFields = computed(() => {
  return modification.value.type === 'custom_modification';
});

const submitButtonText = computed(() => {
  return loading.value ? 'Création...' : 'Créer la modification';
});

const minDate = computed(() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
});

const maxDate = computed(() => {
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  return maxDate.toISOString().split('T')[0];
});

const modificationInfo = computed(() => {
  if (!modification.value.type) return null;
  
  switch (modification.value.type) {
    case 'absence':
      return {
        type: 'info',
        message: 'Une absence sera déclarée pour cette date. Vous ne serez pas disponible pour les substitutions.'
      };
    case 'off_day':
      return {
        type: 'info',
        message: 'Un jour de congé sera déclaré pour cette date. Vous ne serez pas disponible pour les substitutions.'
      };
    case 'custom_modification':
      return {
        type: 'info',
        message: 'Une modification personnalisée sera créée. Vous pouvez spécifier des heures de début et de fin.'
      };
    default:
      return null;
  }
});

// Méthodes
const onTypeChange = () => {
  // Réinitialiser les heures si ce n'est pas une modification personnalisée
  if (modification.value.type !== 'custom_modification') {
    modification.value.startTime = '';
    modification.value.endTime = '';
  }
  checkConflicts();
};

const onDateChange = () => {
  checkConflicts();
};

const checkConflicts = async () => {
  if (!modification.value.date) {
    hasConflicts.value = false;
    return;
  }
  
  try {
    hasConflicts.value = await planningModificationStore.checkSubstitutionConflicts(modification.value.date);
  } catch (error) {
    console.error('Erreur lors de la vérification des conflits:', error);
    hasConflicts.value = false;
  }
};

const closeDialog = () => {
  if (!loading.value) {
    emit('onClose');
    resetForm();
  }
};

const resetForm = () => {
  modification.value = {
    type: '',
    date: props.date || '',
    startTime: '',
    endTime: '',
    comment: '',
    centerId: props.centerId || authStore.centerId
  };
  hasConflicts.value = false;
  if (form.value) {
    form.value.reset();
  }
};

const submitModification = async () => {
  if (!form.value?.validate()) return;
  
  try {
    loading.value = true;
    
    const modificationData = {
      ...modification.value,
      date: new Date(modification.value.date).toISOString()
    };
    
    const newModification = await planningModificationStore.createModification(modificationData);
    
    emit('onSubmit', newModification);
    closeDialog();
    
  } catch (error) {
    console.error('Erreur lors de la création de la modification:', error);
    // L'erreur sera gérée par le store
  } finally {
    loading.value = false;
  }
};

// Watchers
watch(() => props.date, (newDate) => {
  if (newDate) {
    modification.value.date = newDate;
    checkConflicts();
  }
});

watch(() => props.centerId, (newCenterId) => {
  if (newCenterId) {
    modification.value.centerId = newCenterId;
  }
});

// Lifecycle
onMounted(() => {
  if (props.date) {
    checkConflicts();
  }
});
</script>

<style scoped>
.v-date-picker {
  width: 100%;
}
</style>
