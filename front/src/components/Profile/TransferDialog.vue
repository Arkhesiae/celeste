<template>
  <v-dialog v-model="localDialogVisible" max-width="500">
    <v-card rounded="xl" class="pa-6">
      <v-card-title class="pa-0">Faire un Virement</v-card-title>
      <v-card-text class="pa-0 py-6 ">
        <v-form @submit.prevent="confirmTransfer">
          <v-number-input v-model="transferAmount" class="text-primary" reverse controlVariant="split" label=""
                    rounded="xl" bg-color="surfaceContainer" color="blue" glow :hideInput="false" inset
                    base-color="transparent" variant="outlined"
                    :min="0"
                    :rules="[v => v > 0 || 'Le montant doit être supérieur à 0']">
          </v-number-input>
    
          <v-autocomplete
            v-model="transferRecipient"
            :items="availableUsers"
            :item-title="getUserFullName"
            item-value="_id"
            label="Destinataire"
            variant="solo"
            elevation="0"
            bg-color="onBackground"
            rounded="xl"
            :loading="isLoadingUsers"
            :rules="[v => !!v || 'Le destinataire est requis']"
            class="mb-4"
          >
            <template v-slot:item="{ props, item }">
              <v-list-item v-bind="props" :title="getUserFullName(item.raw)" :subtitle="getUserSubtitle(item.raw)">
                <template v-slot:prepend>
                  <v-avatar size="32" color="primary">
                    {{ getUserFullName(item.raw).charAt(0) }}
                  </v-avatar>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>

          <!-- <v-checkbox
            v-model="isDelayedTransfer"
            label="Virement différé"
            color="primary"
            class="mb-4"
          ></v-checkbox> -->

          <v-text-field
            v-if="isDelayedTransfer"
            v-model="transferDate"
            type="date"
            label="Date du virement"
            variant="solo"
            elevation="0"
            :rules="[v => !!v || 'La date est requise', v => isFutureDate(v) || 'La date doit être dans le futur']"
            :min="minDate"
          ></v-text-field>
        </v-form>
      </v-card-text>
      <v-card-actions class="pa-0">
        <v-btn
          color="secondary"
          text

          @click="closeDialog"
          :disabled="isLoading"
        >
          Annuler
        </v-btn>
        <v-btn
          color="primary"
          text

          @click="confirmTransfer"
          :loading="isLoading"
        >
          Confirmer
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { userService } from "@/services/userService.js";
import { useSnackbarStore } from "@/stores/snackbarStore.js";
import { useAuthStore } from "@/stores/authStore.js";
import { usePointStore } from "@/stores/pointStore.js";
import { useCenterStore } from "@/stores/centerStore.js";
const pointStore = usePointStore();
const centerStore = useCenterStore();
const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true
  },
  userId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['update:dialogVisible', 'transfer-success']);

const localDialogVisible = ref(props.dialogVisible);
const transferAmount = ref( 0  );
const transferRecipient = ref('');
const isLoading = ref(false);
const isLoadingUsers = ref(false);
const availableUsers = ref([]);
const snackbarStore = useSnackbarStore();
const authStore = useAuthStore();
const isDelayedTransfer = ref(false);
const transferDate = ref('');
const minDate = new Date().toISOString().split('T')[0];

// Synchroniser la variable locale avec la prop
watch(() => props.dialogVisible, (newValue) => {
  localDialogVisible.value = newValue;
  if (newValue) {
    fetchAvailableUsers();
  }
});

// Émettre les changements de la variable locale vers le parent
watch(localDialogVisible, (newValue) => {
  emit('update:dialogVisible', newValue);
});

const fetchAvailableUsers = async () => {
  try {
    isLoadingUsers.value = true;
    let users;
    
    // Si c'est un administrateur maître, récupérer tous les utilisateurs
    if (authStore.isAdmin && authStore.adminType === 'master') {
      users = await userService.getUsers();
    } else {
      // Sinon, récupérer seulement les utilisateurs du centre
      users = await userService.fetchUsersByCenter(authStore.centerId);
    }
    
    // Filtrer l'utilisateur courant de la liste
    availableUsers.value = users.filter(user => user._id !== props.userId);
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la récupération des utilisateurs', 'onError' , 'mdi-alert-circle');
  } finally {
    isLoadingUsers.value = false;
  }
};

const validateTransferForm = () => {
  if (!transferAmount.value || transferAmount.value <= 0) {
    snackbarStore.showNotification('Le montant doit être supérieur à 0', 'onError' , 'mdi-alert-circle');
    return false;
  }
  if (!transferRecipient.value) {
    snackbarStore.showNotification('Le destinataire est requis', 'onError' , 'mdi-alert-circle');
    return false;
  }
  if (isDelayedTransfer.value && !transferDate.value) {
    snackbarStore.showNotification('La date du virement différé est requise', 'onError' , 'mdi-alert-circle');
    return false;
  }
 
  return true;
};

const confirmTransfer = async () => {
  if (!validateTransferForm()) return;

  try {
    isLoading.value = true;
    const scheduledDate = isDelayedTransfer.value ? transferDate.value : null;
    await pointStore.transferPoints(props.userId, transferRecipient.value, transferAmount.value, '', scheduledDate);
    snackbarStore.showNotification(
      isDelayedTransfer.value 
        ? 'Virement différé programmé avec succès' 
        : 'Transfert de points effectué', 
      'onPrimary' , 'mdi-check'
    );
    closeDialog();
    console.log("Success");
    emit('transfer-success');
  } catch (error) {
    console.log("error", error);
    snackbarStore.showNotification(error.message, 'onError' , 'mdi-alert-circle');
  } finally {
    isLoading.value = false;
  }
};

const closeDialog = () => {
  localDialogVisible.value = false;
  transferAmount.value = 0;
  transferRecipient.value = '';
  isDelayedTransfer.value = false;
  transferDate.value = '';
};

const isFutureDate = (date) => {
  const selectedDate = new Date(date);
  const today = new Date();
  return selectedDate > today;
};

const getCenterName = (centerId) => {
  const center = centerStore.centers.find(center => center._id === centerId);
  return center?.name;
};

const getUserSubtitle = (user) => {
  if (authStore.isAdmin) {
    return getCenterName(user.centerId);
  }
  return ' ';
};

const getUserFullName = (user) => {
  if (!user) return '';
  return `${user.name} ${user.lastName}`;
};
</script> 

<style scoped>
:deep(.v-number-input .v-field__field input) {
  color: rgb(var(--v-theme-remplacement)) !important;
  font-size: 1.5rem;
  font-weight: 600;
}

:deep(.v-number-input.secondary .v-field__field input) {
  color: rgb(var(--v-theme-secondary)) !important;
  font-size: 1rem;
  font-weight: 600;
}

:deep(.v-btn--icon) {
  color: rgb(var(--v-theme-remplacement)) !important;
  background-color: rgb(var(--v-theme-surface-container)) !important;


}
</style>
