<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
  rotation: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:dialogVisible', 'onSubmit']);

const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit('update:dialogVisible', value),
});

const newName = ref(props.rotation.name);

const nameRules = [
  v => !!v || 'Le nom est requis',
];

const submit = () => {
  emit('onSubmit', { ...props.rotation, name: newName.value });
  localDialogVisible.value = false;
};
</script>

<template>
  <v-dialog v-model="localDialogVisible" max-width="500px">
    <v-card rounded="xl" elevation="0" color="surfaceContainerHigh">
      <v-card-item class="pa-6">
        <div class="d-flex align-center justify-space-between">
          <div>
            <div class="text-h6 font-weight-medium">Modifier le nom</div>
            <div class="text-medium-emphasis text-body-2 mt-1">
              Modifiez le nom du tour de service
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="localDialogVisible = false"></v-btn>
        </div>
      </v-card-item>

      <v-card-text class="pa-6 pt-0">
        <v-text-field
          v-model="newName"
          label="Nom du tour de service"
          :rules="nameRules"
          variant="outlined"
          rounded="xl"
          hide-details="auto"
        ></v-text-field>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          variant="flat"
          rounded="xl"
          @click="submit"
          :disabled="!newName"
        >
          Enregistrer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
