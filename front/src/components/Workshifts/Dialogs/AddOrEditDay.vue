<template>
  <!-- <GeneralDialog v-model="localDialogVisible" title="Ajouter une vacation" :description="mode === 'edit' ? 'Modifier la vacation' : 'Ajouter une vacation'"  /> -->
  <v-dialog v-model="localDialogVisible" :fullscreen="xs" max-width="600" style="z-index: 3100 !important;">
    <v-card rounded="xl" color="surfaceContainer">
      <v-card-item class="pa-6  mb-4">
        <v-card-title class="">
          <div class="text-h6 font-weight-medium">{{ mode === 'edit' ? 'Modifier la vacation' : 'Ajouter une vacation'
          }}
          </div>
        </v-card-title>
        <v-card-subtitle class="text-medium-emphasis">
          <span v-if="currentStep === 1">{{ mode === 'edit' ? 'Choisissez le type d\'horaires pour cette vacation' :
            'Choisissez le type d\'horaires pour cette vacation' }}</span>
          <span v-else>{{ mode === 'edit' ? 'Modifiez les horaires et les points de cette vacation' : 'Configurez les horaires et les points pour cette vacation' }}</span>
        </v-card-subtitle>
        <template #append>
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <!-- Étape 1: Choix du type d'horaires -->
      <v-fade-transition mode="out-in">
      <v-card-text v-if="currentStep === 1" class="pa-6 pt-0">
        <v-card-title class="text-subtitle-1 font-weight-medium pa-0 mb-4">Type d'horaires</v-card-title>

        <div class="d-flex flex-column ga-3">
          <v-card
            :class="['pa-4 cursor-pointer transition-all', hourType === 'fixed' ? 'selected' : 'outlined']"
            :color="hourType === 'fixed' ? 'onBackground' : 'surface'" flat  @click="hourType = 'fixed'" rounded="xl">
            <div class="d-flex align-center">

              <div class="ml-3">
                <div class="text-subtitle-1 font-weight-medium">Heures fixes</div>
                <div class="text-body-2 opacity-50">Une seule vacation élémentaire</div>
              </div>
            </div>
          </v-card>

          <v-card
              :class="['pa-4 cursor-pointer transition-all', hourType === 'variable' ? 'selected' : 'outlined']"
            :color="hourType === 'variable' ? 'onBackground' : 'surface'" flat  @click="hourType = 'variable'" rounded="xl">
            <div class="d-flex align-center">

              <div class="ml-3">
                <div class="text-subtitle-1 font-weight-medium">Heures variables</div>
                <div class="text-body-2 opacity-50">Plusieurs vacations élémentaires</div>
              </div>
            </div>
          </v-card>
        </div>
      </v-card-text>
 

      <!-- Étape 2: Configuration des horaires -->
      <v-card-text v-if="currentStep === 2" class="pa-6 pt-0">
        <div class="d-flex flex-wrap align-start flex-column flex-grow-1 mb-6">
          <div class="d-flex justify-space-around flex-wrap align-center ga-4 flex-grow-1">
            <v-text-field v-model="newDay.name"  variant="solo-filled" flat class="flex-grow-1"
              bg-color="surfaceContainer" min-width="150px" rounded="xl" hide-details
              placeholder="Ex: Jour 1"></v-text-field>


            <div class="d-flex justify-space-between flex-column align-center ">
              
              <div >
                <v-card-title class="text-subtitle-1 text-caption ma-0  pa-0">{{ hourType === 'variable' ? 'Amplitude totale' : 'Amplitude' }}</v-card-title>
                <div class="d-flex align-center flex-wrap ga-1">
                  <span v-if="hourType === 'variable'" class="text-body-1 font-weight-bold">{{ earliestStart }}</span>
                  <span v-else class="text-body-1 font-weight-bold">{{ newDay.startTime }}</span>

                  <span class="mx-1">-</span>
                  <span v-if="hourType === 'variable'" class="text-body-1 font-weight-bold">{{ latestEnd }}</span>
                  <span v-else class="text-body-1 font-weight-bold">{{ newDay.endTime }}</span>
                  <span v-if="endsNextDay(null)" class="ml-1 0"
                    style="font-size: 10px; opacity: 0.8; top: -2px; position: relative;">+1</span>

                </div>
              </div>


            </div>
            
          </div>
          <div class="d-flex align-center justify-start ga-2">
              <v-switch v-model="newDay.optional" false-icon="mdi-close" color="surfaceContainerHighest" true-icon="mdi-plus-box-outline"
                icon-color="onBackground" base-color="surfaceContainerHighest" inset hide-details></v-switch>
              <span class="text-body-2">Jour optionnel</span>
            </div>
        </div>

        <div v-if="hourType === 'fixed'" class="d-flex flex-column align-start">
                <v-card-title class="text-subtitle-1 font-weight-medium ma-0  pa-0 mb-4">Horaires</v-card-title>
                <div class="d-flex align-center align-self-center ga-2  ">
                  <v-chip class="ma-2" color="onBackground" variant="flat" rounded="xl" size="small">
                    {{ newDay.name }}
                  </v-chip>
             
                  <v-chip size="small" class="m-2 px-4" rounded="lg" @click="openTimePicker('startTime')"
                    append-icon="mdi-menu-down">
                    <span v-if="!newDay.startTime">Début</span>
                    <span v-if="!xs && newDay.startTime">Début à</span>
                    <span v-if="newDay.startTime" class="ml-1">{{ newDay.startTime }}</span>
                  </v-chip>
                  <span class="">-</span>
                  <v-chip size="small" class="m-2 px-4" rounded="lg" @click="openTimePicker('endTime')" append-icon="mdi-menu-down">
                    <span v-if="!newDay.endTime">Fin</span>
                    <span v-if="!xs && newDay.endTime">Fin à</span>
                    <span v-if="newDay.endTime" class="ml-1">{{ newDay.endTime }}</span>
                    <span v-if="endsNextDay(null)" class="ml-1"
                      style="font-size: 10px; opacity: 0.8; top: -2px; position: relative;">+1</span>
                  </v-chip>

                </div>
              </div>

        <v-card-title class="text-subtitle-1 font-weight-medium pa-0 mb-4" v-if="hourType === 'variable'">Vacations
          élémentaires</v-card-title>
        <v-card v-if="hourType === 'variable'" :rounded="smAndDown ? 'xl' : 'lg'" elevation="0" class="pa-0"
          :class="!xs ? 'bg-transparent' : 'bg-transparent'">

          <v-card-text :class="xs ? 'pa-0' : 'pa-2'" v-if="newDay.variations.length > 0">

            <!-- Horaires par défaut -->



            <!-- Variantes -->
            <div v-for="(variant, index) in newDay.variations" :key="index" class="mb-1">
              <v-card class="d-flex align-center justify-space-between" flat color="transparent" height="48"
                :rounded="smAndDown ? 'xl' : 'lg'">
                <div class="d-flex align-center justify-space-between">
                  <v-chip size="small" class="ma-2" color="onBackground" variant="flat" rounded="xl"
                    @click="handleChangeVariantName(index)">
                    {{ newDay.name + ' ' + variant.name }}

                  </v-chip>
                  <v-chip class="m-2 px-4" rounded="lg" @click="openTimePicker('startTime', index)"
                    append-icon="mdi-menu-down" size="small">
                    <span v-if="!variant.startTime">Début</span>
                    <span v-if="!xs && variant.startTime">Début à</span>
                    <span v-if="variant.startTime" class="ml-1">{{ variant.startTime }}</span>
                  </v-chip>
                  <v-chip class="mx-2 px-4" rounded="lg" @click="openTimePicker('endTime', index)"
                    append-icon="mdi-menu-down" size="small">
                    <span v-if="!variant.endTime">Fin</span>
                    <span v-if="!xs && variant.endTime">Fin à</span>
                    <span v-if="variant.endTime" class="ml-1">{{ variant.endTime }}</span>
                    <span v-if="endsNextDay(index)" class="ml-1"
                      style="font-size: 10px; opacity: 0.8; top: -2px; position: relative;">+1</span>
                  </v-chip>
                </div>
                <v-btn icon="mdi-close" variant="text" size="small" color="onBackground" class="justify ma-1"
                  @click="removeVariant(index)"></v-btn>
              </v-card>
            </div>
          </v-card-text>
          <v-card-actions :class="xs ? 'pa-0' : 'pa-2'" v-if="newDay.variations.length < variations.length">
            <v-spacer v-if="!smAndDown"></v-spacer>
            <v-btn color="onBackground" variant="flat" prepend-icon="mdi-plus" @click="addVariant"
              :height="smAndDown ? 48 : 36" :block="smAndDown" :rounded="smAndDown ? 'xl' : 'lg'" class="px-6"> Ajouter
              une vacation
            </v-btn>
          </v-card-actions>
        </v-card>

      </v-card-text>
    </v-fade-transition>

      <!-- Boutons de navigation -->
      <div class="pa-6 d-flex justify-space-between">
        <v-btn v-if="currentStep === 2" color="primary" variant="text" rounded="xl" prepend-icon="mdi-arrow-left"
          @click="currentStep = 1">
          Retour
        </v-btn>
        <v-spacer v-if="currentStep === 1"></v-spacer>

        <v-btn v-if="currentStep === 1" color="primary" variant="text" rounded="xl" append-icon="mdi-arrow-right"
          @click="goToStep2" :disabled="!hourType">
          Suivant
        </v-btn>

        <v-btn v-if="currentStep === 2" color="primary" variant="text" rounded="xl" @click="submit"
          :disabled="!isValid">
          {{ mode === 'edit' ? 'Modifier' : 'Ajouter' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <TimePickerDialog style="z-index: 3200 !important;" v-model="timePickerDialog.open" :type="timePickerDialog.type"
    :time="timePickerDialog.time" @update:time="(value) => timePickerDialog.time = value" @save="saveTimePicker"
    @close="closeTimePicker" />

  <v-dialog v-model="showVariantNameDialog" max-width="500" style="z-index: 3300 !important;">
    <v-card rounded="xl" color="surfaceContainer">
      <v-card-item class="pa-6  mb-4">
        <v-card-title class="">
          <div class="text-h6 font-weight-medium">Modifier le nom de la variante</div>
        </v-card-title>
      </v-card-item>
      <v-card-text class="pa-6 pt-0">
        <v-text-field v-model="newVariantName" label="Nom de la variante" variant="outlined" class="mb-6 flex-grow-1"
          bg-color="surface" min-width="100px" rounded="lg" placeholder="Ex: Variante 1"
          :rules="[rules.required, rules.maxLength(5)]"></v-text-field>
      </v-card-text>
      <v-card-actions class="pa-6 d-flex justify-end">
        <v-btn color="primary" variant="text" rounded="xl" class="ml-4" @click="submitVariantName"
          :disabled="!isValidVariantName">
          Modifier
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useDisplay } from 'vuetify';
import { VCard } from 'vuetify/components';
import TimePickerDialog from './TimePicker.vue';

const { smAndDown, xs } = useDisplay();

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  day: {
    type: Object,
    default: null
  },
  dayNumber: {
    type: Number,
  },
  mode: {
    type: String,
    default: 'add'
  },
  variations: {
    type: Array,
    default: () => ['A', 'B', 'C']
  },
  existingDay: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['onSubmit', 'update:modelValue']);

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

// Gestion des étapes
const currentStep = ref(1);
const hourType = ref('fixed');

const newDay = ref({
  name: 'J' + props.dayNumber,
  startTime: '',
  endTime: '',
  defaultPoints: 0,
  variations: [],
  type: 'work',
  optional: false
});

const rules = {
  required: (value) => !!value || 'Ce champ est requis',
  maxLength: (max) => (value) => value.length <= max || `Le nom ne doit pas dépasser ${max} caractères`,
};

const earliestStart = computed(() => {
  if (!newDay.value.variations.length) return '';

  return newDay.value.variations
    .filter(variant => variant.startTime)
    .reduce((min, variant) => {
      return !min || variant.startTime < min ? variant.startTime : min;
    }, '');
});

const latestEnd = computed(() => {
  if (!newDay.value.variations.length) return '';

  const variantsWithEndTime = newDay.value.variations.filter(variant => variant.endTime);
  
  // Priorité aux variantes qui se terminent le jour suivant
  const variantsEndingNextDay = variantsWithEndTime.filter(variant => 
    checkEndsNextDay(variant.startTime, variant.endTime)
  );
  
  if (variantsEndingNextDay.length > 0) {
    // Si des variantes se terminent le jour suivant, prendre la plus tardive parmi elles
    return variantsEndingNextDay.reduce((max, variant) => {
      return !max || variant.endTime > max ? variant.endTime : max;
    }, '');
  }
  
  // Sinon, prendre la fin la plus tardive parmi toutes les variantes
  return variantsWithEndTime.reduce((max, variant) => {
    return !max || variant.endTime > max ? variant.endTime : max;
  }, '');
});



// Initialiser les données si on est en mode édition
watch(() => props.day, (newValue) => {
  console.log("newValue", newValue?.variations);
  if (props.mode === 'edit' && newValue) {
    newDay.value = { ...newValue };
    newDay.value.startTime = newValue.default?.startTime || newValue.startTime;
    newDay.value.endTime = newValue.default?.endTime || newValue.endTime;
    newDay.value.defaultPoints = newValue.default?.points || newValue.defaultPoints;
    newDay.value.endsNextDay = newValue.default?.endsNextDay || newValue.endsNextDay;
    newDay.value.optional = newValue.optional;
    if (newValue.variations?.length > 0) {
      newDay.value.variations = newValue.variations;
    } else if (newValue.variants?.length > 0) {
      newDay.value.variations = newValue.variants;
    } else {
      newDay.value.variations = [];
    }

    newDay.value.type = newValue.type;
    newDay.value.name = newValue.name;

    console.log(newDay)
    // Déterminer le type d'heures basé sur les variants existants
    hourType.value =  newValue.variations?.length > 0 || newValue.variants?.length > 0 ? 'variable' : 'fixed';
    currentStep.value = 2; // Aller directement à l'étape 2 en mode édition
  } else if (props.mode === 'add') {
    newDay.value = {
      name: 'J' + props.dayNumber,
      startTime: '',
      endTime: '',
      defaultPoints: 0,
      variations: [],
      type: 'work',
      optional: false
    };
    hourType.value = 'fixed';
    currentStep.value = 1; // Commencer à l'étape 1 en mode ajout
  }
}, { immediate: true });

const reset = () => {
  if (props.mode === 'edit' && props.day) {
    newDay.value = { ...props.day };
    hourType.value = props.day.variations?.length > 0 || props.day.variants?.length > 0 ? 'variable' : 'fixed';
    currentStep.value = 2;
  } else {
    newDay.value = {
      name: 'J' + props.dayNumber,
      startTime: '',
      endTime: '',
      defaultPoints: 0,
      variations: [],
      type: 'work',
      optional: false
    };
    hourType.value = 'fixed';
    currentStep.value = 1;
  }
  timePickerDialog.value = {
    open: false,
    type: '',
    time: '',
    variantIndex: null
  };
};

const timePickerDialog = ref({
  open: false,
  type: '',
  time: '',
  variantIndex: null
});

const openTimePicker = (type, variantIndex = null) => {
  timePickerDialog.value.open = true;
  timePickerDialog.value.type = type;
  timePickerDialog.value.variantIndex = variantIndex;
  if (variantIndex === null) {
    timePickerDialog.value.time = newDay.value[type] || '';
  } else {
    timePickerDialog.value.time = newDay.value.variations[variantIndex][type] || '';
  }
};

const closeTimePicker = () => {
  timePickerDialog.value.open = false;
};

const saveTimePicker = () => {
  const { type, time, variantIndex } = timePickerDialog.value;
  if (variantIndex === null) {
    newDay.value[type] = time;
  } else {
    newDay.value.variations[variantIndex][type] = time;
  }
  closeTimePicker();
};

const addVariant = () => {
  if (newDay.value.variations.length < props.variations.length) {
    const nextVariantName = props.variations[newDay.value.variations.length];
    newDay.value.variations.push({
      name: nextVariantName,
      startTime: '',
      endTime: '',
      defaultPoints: 0
    });
  }
};

const removeVariant = (index) => {
  newDay.value.variations.splice(index, 1);
};


// Fonction utilitaire pour vérifier si une vacation se termine le lendemain
const checkEndsNextDay = (start, end) => {
  if (!start || !end) return false;

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  const startTime = startHour * 60 + startMinute;
  const endTime = endHour * 60 + endMinute;

  return endTime <= startTime;
};

// Computed pour vérifier si une vacation spécifique se termine le lendemain
const endsNextDay = (variantIndex = null) => {
  if (variantIndex === null && hourType.value === 'fixed') {
    return checkEndsNextDay(newDay.value.startTime, newDay.value.endTime);
  }

  if (variantIndex === null && hourType.value === 'variable') {
    return newDay.value.variations.some(variant =>
      checkEndsNextDay(variant.startTime, variant.endTime)
    );
  }

  if (variantIndex !== null && newDay.value.variations[variantIndex]) {
    const variant = newDay.value.variations[variantIndex];
    return checkEndsNextDay(variant.startTime, variant.endTime);
  }

  return false;
};

// Navigation vers l'étape 2
const goToStep2 = () => {
  // Nettoyer les variantes si on passe en mode heures fixes
  if (hourType.value === 'fixed') {
    newDay.value.variations = [];
  }
  currentStep.value = 2;
};

const isValid = computed(() => {
  if (currentStep.value === 1) {
    return !!hourType.value;
  }

  if (newDay.value.name.length === 0) {
    return false;
  }

  // Étape 2 : vérifier les horaires
  if (hourType.value === 'fixed') {
    if (!newDay.value.startTime || !newDay.value.endTime) {
      return false;
    }
  }

  // Si heures variables, vérifier les horaires des variantes
  if (hourType.value === 'variable') {
    return (newDay.value.variations.every(variant =>
      variant.startTime && variant.endTime && variant.name.length > 0
    ) && newDay.value.variations.length > 1 && earliestStart.value && latestEnd.value);
  }

  return true;
});

const submit = () => {
  if (hourType.value === 'variable') {
    newDay.value.startTime = earliestStart.value;
    newDay.value.endTime = latestEnd.value;
    newDay.value.default = {
      startTime: earliestStart.value,
      endTime: latestEnd.value,
      endsNextDay: endsNextDay()
    }
    newDay.value.variations = newDay.value.variations.map(variation => ({
      ...variation,
      endsNextDay: endsNextDay(newDay.value.variations.indexOf(variation))
    }));
  }

  newDay.value.default = {
      startTime: newDay.value.startTime,
      endTime: newDay.value.endTime,
      endsNextDay: endsNextDay()
    }

  newDay.value.endsNextDay = endsNextDay();

  emit('onSubmit', { ...newDay.value });
  reset();
  localDialogVisible.value = false;
};

const close = () => {
  reset();
  localDialogVisible.value = false;
};

const handleChangeVariantName = (index) => {
  showVariantNameDialog.value = true;
  variantIndex.value = index;
};

const submitVariantName = () => {
  newDay.value.variations[variantIndex.value].name = newVariantName.value;
  showVariantNameDialog.value = false;
};

const isValidVariantName = computed(() => {
  return newVariantName.value.length <= 3 && newVariantName.value.length > 0;
});

const showVariantNameDialog = ref(false);
const variantIndex = ref(null);
const newVariantName = ref('');

</script>

<style scoped>
.v-card.v-card__bordered {
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.10002);
}

.cursor-pointer {
  cursor: pointer;
}

.transition-all {
  transition: all 0.2s ease;
}

.outlined {

  border: 2px solid rgba(var(--v-theme-outline), 0.12);
}

.selected {

  border: 2px solid rgba(var(--v-theme-onBackground), 0);
}
</style>