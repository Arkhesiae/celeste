<template>
  <GenericDialog v-model="localDialogVisible" title="Demander une mutation" :max-width="500">
    <template #content>
      <v-form ref="form" v-model="valid">
        <v-select
          v-model="selectedCenter"
          :items="centers"
          label="Centre de destination"
          prepend-inner-icon="mdi-office-building-outline"
          variant="outlined"
          color="primary"
          rounded="xl"
          bg-color="surface"
          hide-details="auto"
          :rules="[(v) => !!v || 'Le centre de destination est requis']"
        />

        <v-textarea
          v-model="reason"
          label="Motif de la demande"
          prepend-inner-icon="mdi-text-box-outline"
          variant="outlined"
          color="primary"
          rounded="xl"
          bg-color="surface"
          hide-details="auto"
          class="mt-4"
          :rules="[(v) => !!v || 'Le motif est requis']"
        />
      </v-form>
    </template>

    <template #footer>
      <v-spacer />
      <v-btn variant="text" :disabled="loading" @click="close">Annuler</v-btn>
      <v-btn variant="tonal" :loading="loading" :disabled="!valid" @click="submit">Envoyer la demande</v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

const form = ref(null);
const valid = ref(false);
const loading = ref(false);
const selectedCenter = ref('');
const reason = ref('');

// TODO: Remplacer par la liste réelle des centres
const centers = ['Centre A', 'Centre B', 'Centre C'];

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
    if (!value) {
      resetForm();
    }
  },
});

const resetForm = () => {
  selectedCenter.value = '';
  reason.value = '';
  form.value?.reset();
};

const close = () => {
  localDialogVisible.value = false;
};

const submit = async () => {
  if (!form.value?.validate()) return;

  loading.value = true;
  try {
    // TODO: Implémenter l'appel API pour envoyer la demande de mutation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    emit('success', 'Votre demande de mutation a été envoyée avec succès');
    close();
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.v-btn {
  text-transform: none;
  letter-spacing: 0;
}
</style>
