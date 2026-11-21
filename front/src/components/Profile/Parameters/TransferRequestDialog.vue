<template>
  <GenericDialog v-model="localDialogVisible" :title="step === 'form' ? 'Demander une mutation' : 'Confirmer la mutation'" :max-width="600">
    <template #content>
      <!-- 1. Centre d'arrivée et motif -->
      <v-form v-show="step === 'form'" ref="form" v-model="valid">
        <v-select
          v-model="selectedCenter"
          :items="centers"
          item-title="name"
          item-value="_id"
          :item-props="(center) => ({ subtitle: center.OACI })"
          label="Centre de destination"
          prepend-inner-icon="mdi-airport"
          variant="solo-filled"
          flat
          color="primary"
          rounded="xl"
          bg-color="surfaceContainer"
          hide-details="auto"
          :rules="[(v) => !!v || 'Le centre de destination est requis']"
        />

        <v-textarea
          v-model="reason"
          label="Motif de la demande"
       
          variant="solo-filled"
          flat
          color="primary"
          rounded="xl"
          bg-color="surfaceContainer"
          hide-details="auto"
          class="mt-4"
          counter="500"
          :rules="[(v) => !!v?.trim() || 'Le motif est requis', (v) => (v ?? '').length <= 500 || '500 caractères au maximum']"
        />
      </v-form>

      <!-- 2. Ce que l'acceptation effacera -->
      <div v-if="step === 'confirm'" class="d-flex flex-column ga-3">
        <div class="text-body-medium">
          Votre demande sera envoyée à l'administrateur de <strong>{{ destinationName }}</strong>. Tant qu'elle est en attente, vous ne
          pouvez plus modifier vos équipes, vos points ni vos remplacements ; vous pouvez l'annuler à tout moment.
        </div>

        <v-alert type="warning" variant="tonal" rounded="xl" density="comfortable" icon="mdi-broom">
          <div class="font-weight-bold mb-1">Si la mutation est acceptée, votre période à venir sera nettoyée :</div>
          <ul class="pl-4">
            <li>
              {{ impact.entries }} entrée{{ impact.entries > 1 ? 's' : '' }} de calendrier liée{{ impact.entries > 1 ? 's' : '' }} à une
              vacation désactivée{{ impact.entries > 1 ? 's' : '' }}
            </li>
            <li>
              {{ impact.demands }} remplacement{{ impact.demands > 1 ? 's' : '' }} ou permutation{{
                impact.demands > 1 ? 's' : ''
              }}
              à venir annulé{{ impact.demands > 1 ? 's' : '' }} (ou dont vous vous désistez)
            </li>
            <li>Vos équipes retirées et vos points remis à zéro</li>
          </ul>
        </v-alert>

        <v-alert v-if="impact.negativePoints" type="error" variant="tonal" rounded="xl" density="comfortable" icon="mdi-alert-circle-outline">
          Votre solde de points est négatif ({{ impact.points }}). Partir avec un solde négatif, c'est mal.
        </v-alert>
      </div>
    </template>

    <template #footer>
      <v-btn v-if="step === 'confirm'" variant="text" :disabled="loading" @click="step = 'form'">Retour</v-btn>
      <v-btn v-if="step === 'form'" variant="text" :disabled="loading" @click="close">Annuler</v-btn>
      <v-spacer />
   
      <v-btn v-if="step === 'form'" variant="tonal" :loading="loading" :disabled="!valid" @click="next">Continuer</v-btn>
      <v-btn v-else variant="tonal" color="primary" :loading="loading" @click="submit">Confirmer la mutation</v-btn>
    </template>
  </GenericDialog>
</template>

<script setup>
import { useCenterStore } from '@/stores/centerStore';
import { useAuthStore } from '@/stores/authStore';
import { useCenterTransferStore } from '@/stores/centerTransferStore';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'success', 'error']);

const centerStore = useCenterStore();
const authStore = useAuthStore();
const transferStore = useCenterTransferStore();

const form = ref(null);
const valid = ref(false);
const loading = ref(false);
const step = ref('form');
const selectedCenter = ref('');
const reason = ref('');
const impact = ref({ demands: 0, entries: 0, points: 0, negativePoints: false });

// Tous les centres sauf le sien
const centers = computed(() => centerStore.centers.filter((center) => center._id !== authStore.userData.centerId));
const destinationName = computed(() => centers.value.find((center) => center._id === selectedCenter.value)?.name ?? '');

const localDialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
    if (!value) resetForm();
  },
});

watch(
  () => props.modelValue,
  (visible) => {
    if (visible && !centerStore.centers.length) centerStore.fetchCenters();
  },
);

const resetForm = () => {
  step.value = 'form';
  selectedCenter.value = '';
  reason.value = '';
  form.value?.reset();
};

const close = () => {
  localDialogVisible.value = false;
};

// Étape 1 -> 2 : on lit ce que l'acceptation effacerait avant de demander confirmation
const next = async () => {
  if (!(await form.value?.validate())?.valid) return;

  loading.value = true;
  try {
    impact.value = await transferStore.preview();
    step.value = 'confirm';
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue');
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  loading.value = true;
  try {
    await transferStore.request({ toCenterId: selectedCenter.value, reason: reason.value.trim() });
    emit('success', 'Votre demande de mutation a été envoyée avec succès');
    close();
  } catch (error) {
    emit('error', error.message || 'Une erreur est survenue');
  } finally {
    loading.value = false;
  }
};
</script>
