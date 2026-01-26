<script setup>

import { useDate, useDisplay } from "vuetify";


// Props & Emits
const props = defineProps({
  isDialogVisible: {
    type: Boolean,
    required: true,
  },
});

const date = useDate()

const emit = defineEmits(["onClose", "onSubmit", "update:dialogModeValue", "update:dialogVisible"]);

// Détection du mode mobile
const { smAndDown } = useDisplay();

// Liaison avec `v-model` du dialog
const localDialogVisible = computed({
  get: () => props.isDialogVisible,
  set: (value) => emit("update:dialogVisible", value),
});

// Date sélectionnée (initialement vide)
const selectedDate = ref(null);

// Formater la date pour l'affichage dans le champ texte
const formattedDate = computed(() =>
  selectedDate.value ? date.format(selectedDate.value, "keyboardDate") : ""
);

// Gestion de la sélection de la date
const updateDate = (newDate) => {
  selectedDate.value = newDate; // Met à jour la date
  emit("update:dialogModeValue", newDate); // Émet l'événement
};

// Soumission des données
const submit = () => {
  if (selectedDate.value) {
    console.log('submitting date', selectedDate.value);
    emit("onSubmit", selectedDate.value);
    localDialogVisible.value = false; // Ferme le dialogue après validation
  }
};

// Fermeture du dialogue
const close = () => {
  localDialogVisible.value = false;
};
</script>

<template>
  <v-dialog v-model="localDialogVisible" width="400px" :fullscreen="smAndDown" style="z-index: 3000 !important;">
    <v-card :rounded="!smAndDown ? 'xl' : ''" elevation="0" class="pa-0 pt-6">
      <v-card-item class="py-1 px-6 mb-2">
        <v-card-title class="d-flex justify-space-between align-center">
          Programmer un TDS
        </v-card-title>
        <template v-if="!smAndDown" #append>
          <v-btn icon="mdi-close" variant="text" @click="close" />
        </template>
        <template v-else #prepend>
          <v-btn icon="mdi-arrow-left" variant="text" @click="close" />
        </template>
      </v-card-item>

      <v-card-text class="mt-8">
        <!-- Champ texte affichant la date sélectionnée -->
        <div class="d-flex justify-space-between align-center pa-6">
          <v-text-field
rounded="lg" prepend-inner-icon="mdi-calendar" class="cursor-pointer" variant="solo" flat
            bg-color="background" :model-value="formattedDate" persistent-hint hint="Début" label="Date d'activation"
            readonly />
        </div>

        <!-- Sélecteur de date -->
        <v-date-picker
hide-header flat elevation="0" class="mx-auto mt-4" width="100%" :model-value="selectedDate"
          locale="fr" @update:model-value="updateDate" />
      </v-card-text>

      <v-card-actions class="pa-8">
        <v-spacer />
        <v-btn
color="primary" variant="tonal" rounded="xl" :disabled="!selectedDate"
          prepend-icon="mdi-clock-star-four-points-outline" @click="submit">
          Programmer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
