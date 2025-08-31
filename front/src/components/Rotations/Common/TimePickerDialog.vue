<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  time: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'update:time', 'save', 'close']);

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const localTime = computed({
  get: () => props.time,
  set: (value) => emit('update:time', value)
});

const closeTimePicker = () => {
  emit('close');
};

const saveTimePicker = () => {
  emit('save');
};
</script>

<template>
  <v-dialog v-model="localDialogVisible" persistent max-width="500px">
    <v-card rounded="xl" elevation="0" color="surfaceContainerHigh">
      <v-card-item class="pa-6">
        <div class="d-flex align-center justify-space-between ">
          <div>
            <div class="text-h6 font-weight-medium">
              {{ type === 'startTime' ? 'Heure de début' : 'Heure de fin' }}
            </div>
            <div class="text-medium-emphasis text-body-2 mt-1">
              Sélectionnez l'heure pour cette vacation
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closeTimePicker"></v-btn>
        </div>
      </v-card-item>

      <v-card-text class="d-flex justify-center pa-0 pt-0">
        <v-time-picker
          v-model="localTime"
          color="primary"
         
          bg-color="transparent"
          format="24hr"
          scrollable
          title=""
          locale="fr"
          rounded="xl"
          :allowed-minutes="[0, 30, 15, 45]"
          elevation="0"
          width="100%"
        ></v-time-picker>
      </v-card-text>

      <v-card-actions class="pa-6">
       
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="text"
          rounded="xl"
          class="ml-4"
          @click="saveTimePicker"
          :slim="true"
          size="large"
        >
          Enregistrer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template> 

<style scoped>
:deep(.v-time-picker-clock) {
  background: rgba(var(--v-theme-background), 1  ) !important;
  border: 1px solid rgba(var(--v-theme-surface-variant), 0.05);
}


</style>
