<template>
  <DemandModal
    v-model="showDemandDetailsModal"
    :demand="selectedDemand"
    @handle-replacement="handleReplacement"
    @handle-switch="handleSwitch"
    @cancel-demand="handleCancel"
    @withdraw-demand="handleWithdraw"
    @update-demand="selectedDemand = $event"
  />

  <ConfirmationDialog v-model="showConfirmationDialog" :title="dialogTitle" :text="dialogText">
    <template #actions>
      <!-- Accept/Replace flow -->
      <template v-if="dialogOption === 'accept'">
        <v-btn
v-if="userHasShift && canSwitch" variant="tonal" rounded="xl" :loading="loading.accept"
          @click="handleConfirmSwitch">
          Permuter
        </v-btn>
        <v-btn color="primary" variant="flat" rounded="xl" :loading="loading.accept" @click="handleConfirmAccept">
          Remplacer
        </v-btn>
      </template>

      <!-- Switch flow -->
      <v-btn
v-else-if="dialogOption === 'switch'" color="primary" variant="flat" rounded="xl" :loading="loading.accept"
        @click="handleConfirmSwitch">
        Permuter
      </v-btn>

      <!-- Cancel/Withdraw flow -->
      <v-btn
v-else-if="dialogOption === 'cancel' || dialogOption === 'withdraw'" color="primary" variant="flat"
        rounded="xl" :loading="loading.accept" @click="handleConfirmAction">
        {{ dialogOption === 'cancel' ? 'Supprimer' : 'Se désister' }}
      </v-btn>
    </template>
  </ConfirmationDialog>
</template>

<script setup>

import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useSubstitutionStore } from "@/stores/substitutionStore.js";

const snackbarStore = useSnackbarStore();
const substitutionStore = useSubstitutionStore();

const showDemandDetailsModal = ref(false);
const selectedDemand = ref(null);
const showConfirmationDialog = ref(false);
const dialogText = ref('');
const dialogTitle = ref('Confirmation');
const dialogOption = ref('');
const userHasShift = ref(false);
const canSwitch = ref(false);
const loading = ref({ accept: false });

const openDemandDetails = (demand) => {
  selectedDemand.value = demand;
  showDemandDetailsModal.value = true;
};

const handleReplacement = async (demand) => {
  try {
    const response = await substitutionStore.checkUserShift(demand.posterShift.date);
    userHasShift.value = response.hasShift;
    canSwitch.value = demand.canSwitch;
    selectedDemand.value = demand;
    dialogOption.value = 'accept';
    dialogTitle.value = "Confirmation de remplacement";
    if (userHasShift.value) {
      dialogText.value = "Vous travaillez déjà ce jour, êtes-vous sûr ?";
    } else {
      dialogText.value = "Êtes-vous sûr de vouloir accepter ce remplacement ?";
    }
    showConfirmationDialog.value = true;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la vérification des shifts', 'onError', "mdi-alert-circle-outline");
    console.error('Erreur lors de la vérification des shifts:', error);
  }
};

const handleConfirmAccept = async () => {
  loading.value.accept = true;
  try {
    await substitutionStore.acceptDemand(selectedDemand.value._id);
    snackbarStore.showNotification('Remplacement accepté', "onRemplacement", "mdi-account-arrow-left-outline");
    showConfirmationDialog.value = false;
    showDemandDetailsModal.value = false;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'acceptation du remplacement : ' + error.message, 'onError', "mdi-alert-circle-outline");
    console.error('Erreur lors de l\'acceptation:', error);
  } finally {
    loading.value.accept = false;
  }
};

const handleSwitch = async (demand) => {
  // If demand is passed (from list), use it. If not, use selectedDemand (from modal)
  const d = demand._id ? demand : selectedDemand.value;
  if (d?.canSwitch) {
    selectedDemand.value = d;
    dialogOption.value = 'switch';
    dialogTitle.value = "Confirmation de permutation";
    dialogText.value = "Êtes-vous sûr de vouloir accepter cette permutation ?";
    showConfirmationDialog.value = true;
  }
};

const handleConfirmSwitch = async () => {
  loading.value.accept = true;
  try {
    await substitutionStore.swapShifts(selectedDemand.value._id);
    snackbarStore.showNotification('Permutation acceptée', "onRemplacement", "mdi-swap-horizontal");
    showConfirmationDialog.value = false;
    showDemandDetailsModal.value = false;
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de l\'échange des shifts : ' + error.message, 'onError', "mdi-alert-circle-outline");
    console.error('Erreur lors de l\'échange:', error);
  } finally {
    loading.value.accept = false;
  }
};

const handleCancel = (demand) => {
  if (demand && demand._id) selectedDemand.value = demand;
  dialogText.value = "Êtes-vous sûr de vouloir supprimer cette demande ?";
  dialogOption.value = 'cancel';
  dialogTitle.value = "Confirmation de suppression";
  showConfirmationDialog.value = true;
};

const handleWithdraw = (demand) => {
  if (demand && demand._id) selectedDemand.value = demand;
  dialogText.value = "Êtes-vous sûr de vouloir vous désister de cette demande ?";
  dialogOption.value = 'withdraw';
  dialogTitle.value = "Confirmation de désistement";
  showConfirmationDialog.value = true;
};

const handleConfirmAction = async () => {
  loading.value.accept = true;
  try {
    if (dialogOption.value === 'cancel') {
      await substitutionStore.cancelDemand(selectedDemand.value._id);
      snackbarStore.showNotification("Demande supprimée", "success", "mdi-delete");
    } else {
      await substitutionStore.unacceptDemand(selectedDemand.value._id);
      snackbarStore.showNotification("Désistement enregistré", "success", "mdi-account-minus");
    }
    showConfirmationDialog.value = false;
    showDemandDetailsModal.value = false;
  } catch (error) {
    console.error('Erreur lors de la confirmation:', error);
    snackbarStore.showNotification("Erreur lors de l'action", "error", "mdi-alert");
  } finally {
    loading.value.accept = false;
  }
};

defineExpose({
  openDemandDetails,
  handleReplacement,
  handleSwitch,
  handleCancel,
  handleWithdraw
});
</script>
