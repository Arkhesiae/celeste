<template>
  <v-dialog v-model="localDialogVisible" max-width="500" style="z-index: 3100 !important;">
    <v-card rounded="xl" color="surfaceContainer">
      <v-card-item class="pa-6  mb-4">
        <v-card-title class="">
          <div class="text-h6 font-weight-medium">{{ mode === 'edit' ? 'Modifier la vacation' : 'Ajouter une vacation' }}
          </div>
        </v-card-title>
        <v-card-subtitle class="text-medium-emphasis">
          {{ mode === 'edit' ? 'Modifiez les horaires et les points de cette vacation' : 'Configurez les horaires et les points pour cette vacation' }}
        </v-card-subtitle>
        <template #append>
          <v-btn icon="mdi-close" variant="text" @click="close"></v-btn>
        </template>
      </v-card-item>

      <v-card-text class="pa-6 pt-0">
        <div class="d-flex justify-start flex-wrap ga-4" >
          <v-text-field v-model="newDay.name" label="Nom du jour" variant="outlined" class="mb-6 flex-grow-1" bg-color="surface"
             min-width="100px" rounded="lg" hide-details placeholder="Ex: Jour 1"></v-text-field>
          <div class="d-flex justify-space-between flex-column align-start mt-n1 flex-grow-1">

            <v-card-title class="text-subtitle-1 font-weight-medium ma-0  pa-0">Horaires</v-card-title>
            <div class="d-flex align-center mb-6 flex-wrap ga-2">
              <v-chip class="m-2 px-4" rounded="lg" @click="openTimePicker('startTime')" append-icon="mdi-menu-down">
                {{ newDay.startTime ? "Début à " + newDay.startTime : 'Début' }}
              </v-chip>
              <span class="mx-2">-</span>
              <v-chip class="m-2 px-4" rounded="lg" @click="openTimePicker('endTime')" append-icon="mdi-menu-down">
                {{ newDay.endTime ? "Fin à " + newDay.endTime : 'Fin' }}
                <span v-if="endsNextDay()" class="ml-1">+1</span>
              </v-chip>

            </div>
          </div>
        </div>
        <v-card-title class="text-subtitle-1 font-weight-medium pa-0 mb-4">Variantes</v-card-title>
        <v-card :rounded="smAndDown ? 'xl' : 'lg'" elevation="0" class="pa-0" :class="!xs ? 'v-card__bordered' : 'bg-transparent'">

          <v-card-text :class="xs ? 'pa-0' : 'pa-2'" v-if="newDay.variants.length > 0">

            <!-- Horaires par défaut -->



            <!-- Variantes -->
            <div v-for="(variant, index) in newDay.variants" :key="index" class="mb-1">
              <v-card class="d-flex align-center justify-space-between" flat color="transparent" height="48"
                :rounded="smAndDown ? 'xl' : 'lg'">
                <div class="d-flex align-center justify-space-between">
                  <v-chip class="ma-2" color="primary" variant="flat" rounded="xl" @click="handleChangeVariantName(index)">
                    {{ variant.name }}

                  </v-chip>
                  <v-chip class="m-2 px-4" rounded="lg" @click="openTimePicker('startTime', index)"
                    append-icon="mdi-menu-down">
                    <span v-if="!variant.startTime">Début</span>
                    <span v-if="!xs && variant.startTime">Début à</span>
                    <span v-if="variant.startTime" class="ml-1">{{ variant.startTime }}</span>
                  </v-chip>
                  <v-chip class="mx-2 px-4" rounded="lg" @click="openTimePicker('endTime', index)"
                    append-icon="mdi-menu-down">
                    <span v-if="!variant.endTime">Fin</span>
                    <span v-if="!xs && variant.endTime">Fin à</span>
                    <span v-if="variant.endTime" class="ml-1">{{ variant.endTime }}</span>
                    <span v-if="endsNextDay(index)" class="ml-1">+1</span>
                  </v-chip>
                </div>
                <v-btn icon="mdi-close" variant="text" size="small" class="justify ma-1"
                  @click="removeVariant(index)"></v-btn>
              </v-card>
            </div>
          </v-card-text>
          <v-card-actions :class="xs ? 'pa-0' : 'pa-2'" v-if="newDay.variants.length < variants.length">
            <v-spacer v-if="!smAndDown"></v-spacer>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addVariant"
              :height="smAndDown ? 48 : 36" :block="smAndDown" :rounded="smAndDown ? 'xl' : 'lg'" class="px-6"> Ajouter
              une variante
            </v-btn>
          </v-card-actions>
        </v-card>

      </v-card-text>

      <div class="pa-6 d-flex justify-end">
        <v-btn color="primary" variant="text" rounded="xl" class="ml-4" @click="submit"
          :disabled="!isValid">
          {{ mode === 'edit' ? 'Modifier' : 'Ajouter' }}
        </v-btn>
      </div>
    </v-card>
  </v-dialog>

  <TimePickerDialog style="z-index: 3200 !important;" v-model="timePickerDialog.open" :type="timePickerDialog.type" :time="timePickerDialog.time"
    @update:time="(value) => timePickerDialog.time = value" @save="saveTimePicker" @close="closeTimePicker" />

  <v-dialog v-model="showVariantNameDialog" max-width="500" style="z-index: 3300 !important;" >
    <v-card rounded="xl" color="surfaceContainer">
      <v-card-item class="pa-6  mb-4">
        <v-card-title class="">
          <div class="text-h6 font-weight-medium">Modifier le nom de la variante</div>
        </v-card-title>
      </v-card-item>
      <v-card-text class="pa-6 pt-0">
        <v-text-field v-model="newVariantName" label="Nom de la variante" variant="outlined" class="mb-6 flex-grow-1" bg-color="surface"
          min-width="100px" rounded="lg"  placeholder="Ex: Variante 1" :rules="[rules.required, rules.maxLength(5)]"></v-text-field>
      </v-card-text>
      <v-card-actions class="pa-6 d-flex justify-end">
        <v-btn color="primary" variant="text" rounded="xl" class="ml-4" @click="submitVariantName" :disabled="!isValidVariantName">
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
  isDialogVisible: {
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
  variants: {
    type: Array,
    default: () => ['A', 'B', 'C']
  },
  existingDay: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['onSubmit', 'update:dialogVisible']);

const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:dialogVisible', value),
});

const newDay = ref({
  name: 'J' + props.dayNumber,
  startTime: '',
  endTime: '',
  defaultPoints: 0,
  variants: [],
  type: 'work'
});

const rules = {
  required: (value) => !!value || 'Ce champ est requis',
  maxLength: (max) => (value) => value.length <= max || `Le nom ne doit pas dépasser ${max} caractères`,
};

// Initialiser les données si on est en mode édition
watch(() => props.day, (newValue) => {
  if (props.mode === 'edit' && newValue) {
    newDay.value = { ...newValue };
  } else if (props.mode === 'add') {
    newDay.value = {
      name: 'J' + props.dayNumber,
      startTime: '',
      endTime: '',
      defaultPoints: 0,
      variants: [],
      type: 'work'
    };
  }
}, { immediate: true });

const reset = () => {
  if (props.mode === 'edit' && props.day) {
    newDay.value = { ...props.day };
  } else {
    newDay.value = {
      name: 'J' + props.dayNumber,
      startTime: '',
      endTime: '',
      defaultPoints: 0,
      variants: [],
      type: 'work'
    };
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
    timePickerDialog.value.time = newDay.value.variants[variantIndex][type] || '';
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
    newDay.value.variants[variantIndex][type] = time;
  }
  closeTimePicker();
};

const addVariant = () => {
  if (newDay.value.variants.length < props.variants.length) {
    const nextVariantName = props.variants[newDay.value.variants.length];
    newDay.value.variants.push({
      name: nextVariantName,
      startTime: '',
      endTime: '',
      defaultPoints: 0
    });
  }
};

const removeVariant = (index) => {
  newDay.value.variants.splice(index, 1);
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

const endsNextDay = computed(() => (variantIndex = null) => {
  let start, end;
  if (variantIndex === null) {
    start = newDay.value.startTime;
    end = newDay.value.endTime;
  } else {
    start = newDay.value.variants[variantIndex].startTime;
    end = newDay.value.variants[variantIndex].endTime;
  }
  if (start && end) {
    return computeWorkDuration(start, end).endsNextDay;
  }
});

const isValid = computed(() => {
  // Vérifier les horaires par défaut
  if (!newDay.value.startTime || !newDay.value.endTime) {
    return false;
  }

  // Vérifier les horaires des variantes
  return newDay.value.variants.every(variant =>
    variant.startTime && variant.endTime && variant.name.length > 0
  );
});

const submit = () => {
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
  newDay.value.variants[variantIndex.value].name = newVariantName.value;
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
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.12);
}
</style>