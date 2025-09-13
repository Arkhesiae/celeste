<script setup>
import { ref, computed, watch } from 'vue';
import GenericDialog from '@/components/Dialogs/GenericDialog.vue';

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: 'Modifier les points'
  },
  points: {
    type: Number,
    required: true
  },
  switch: {
    type: Object,

  }
});

const emit = defineEmits([
  'update:isDialogVisible',
  'update:points'
]);

const localPoints = ref(props.points || 0);


const isDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:isDialogVisible', value)
});



watch(() => props.points, (newValue) => {
  localPoints.value = newValue || 0;
});

const rules = {
  points: v => {
    if (v === '' || v === null || v === undefined) return 'Veuillez saisir un nombre';
    const num = parseInt(v);
    if (isNaN(num)) return 'Veuillez saisir un nombre valide';
    if (num < 0) return 'Les points doivent être positifs';
    return true;
  }
};

const formValid = computed(() => {
  const value = localPoints.value;
  if (value === '' || value === null || value === undefined) return false;
  const num = parseInt(value);
  return !isNaN(num) && num >= 0;
});

const savePoints = () => {
  if (!formValid.value) return;

  emit('update:points', { switchDay: props.switch.id,
    points: localPoints.value,
  });
  localPoints.value = 0;
  isDialogVisible.value = false;
};

const cancel = () => {
  localPoints.value = props.points || 0;
  isDialogVisible.value = false;
};
</script>

<template>
  <GenericDialog 
    v-model="isDialogVisible" 
    :title="title" 
    max-width="400px" 
    @close="cancel"
  >
    <template #content>
      <div>
        <div class="mb-4 d-flex align-center ga-2">
          <v-icon icon="mdi-swap-horizontal" size="16" class="opacity-70"></v-icon>
          <p class="text-body-2 font-weight-medium">Permutation avec {{ props.switch.name }}</p>
        </div>
        
        <v-form>
          <v-text-field
            v-model="localPoints"
        
            :min="0"
            :rules="[rules.points]"
            variant="underlined"
            bg-color="transparent"
            class="big-number-input"
          >
          <template #default>
         
          </template>
        
        </v-text-field>
       
        </v-form>
      </div>
    </template>

    <template #footer>
      <div class="d-flex justify-space-between ">
        <v-btn 
          variant="text" 
          color="secondary" 
          size="small"
          rounded="xl"
          @click="cancel"
        >
          Annuler
        </v-btn>
        <v-btn 
          variant="flat" 
          color="onSurface" 
          size="small"
          rounded="xl"
          :disabled="!formValid"
          @click="savePoints"
        >
          Sauvegarder
        </v-btn>
      </div>
    </template>
  </GenericDialog>
</template>

<style scoped>
:deep(.big-number-input .v-field__field input) {
  color: rgb(var(--v-theme-onSurface)) !important;
  font-size: 3.5rem;
  text-align: center;
  font-weight: 600;
}

:deep(.v-btn--icon) {
  color: rgb(var(--v-theme-primary)) !important;
  background-color: rgb(var(--v-theme-surface-container)) !important;
}
</style>
