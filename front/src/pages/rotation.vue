<template>
  <v-container class="mb-16">
    


      <MainTitle title="Tours de service" subtitle="Créer, modifier et activer un tour de service">
        <template #actions> 
        <v-select v-if="authStore.userData.adminType === 'master'" v-model="selectedCenterId" :items="centers" :item-props="center => ({
          title: center.name,
          subtitle: center.oaci
        })" item-value="_id" label="Sélectionner un centre" variant="solo-filled" rounded="xl" class="mt-4" flat
          min-width="200px" max-width="300px" @update:model-value="handleCenterChange" />

        <v-btn v-else-if="isAdmin" icon color="onBackground" variant="text" size="" @click="showAddDialog = true">
          <v-icon size="32">mdi-plus</v-icon>
        </v-btn>
        </template>

      </MainTitle>

      
      

    <v-row class="position-relative">
      <v-col cols="12" md="8">
        <!-- Workshifts List -->
        <SavedRotation v-for="rotation in rotations" :key="rotation._id" :rotation="rotation" :isActive="isRotationActive(rotation)"
          :is-expanded="expandedRotations[rotation._id]" @set-activation-date="handleSetActivationDate"
          @delete="deleteRotation" @toggle-expand="(id) => expandedRotations[id] = !expandedRotations[id]"
          @edit="handleEdit" 
          ></SavedRotation>
      

        <v-row class="mt-8">
          <v-col cols="12" lg="4" sm="4" xs="12" md="12">
            <v-btn block class="justify-space-between" rounded="xl" color="surface" height="64" v-if="smAndDown"
              variant="flat" @click="showTimelineDrawer = !showTimelineDrawer">
              <template #append>
                <v-icon color="primary">mdi-chevron-right</v-icon>
              </template>
              <v-icon class="mr-4">mdi-timeline-clock</v-icon>
              Voir la timeline
            </v-btn>
          </v-col>

        </v-row>

      </v-col>

      <!-- Timeline -->
      <v-col cols="12" md="4">
        <div v-if="!smAndDown" style="top:150px; position: sticky !important;">
          <v-btn v-if="isAdmin" class="mb-8" prepend-icon="mdi-file-plus-outline" color="onBackground" height="80px"
            width="100%" elevation="0" @click="showAddDialog = true">
            Ajouter un tour de service
          </v-btn>
          <div class="d-flex flex-column mb-6">
            <span class="text-h5 font-weight-medium">Timeline</span>
            <span class="text-subtitle-2 text-medium-emphasis">
              Timeline d'activation des tours de service
            </span>
          </div>
          <Timeline :current-active="currentActive" :sorted-rotations="sortedRotations"
            @remove-activation-date="handleRemoveActivationDate" />
        </div>
      </v-col>
    </v-row>

    <!-- Mobile Timeline Drawer -->
    <v-bottom-sheet v-if="smAndDown" v-model="showTimelineDrawer" location="bottom" temporary class="timeline-drawer">
      <v-card class="pa-6" color="surfaceContainerHigh">
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="d-flex flex-column">
            <span class="text-h5 font-weight-medium">Timeline</span>
            <span class="text-subtitle-2 text-medium-emphasis">
              Timeline d'activation des tours de service
            </span>
          </div>
        </div>
        <Timeline :current-active="currentActive" :sorted-rotations="sortedRotations"
          @remove-activation-date="handleRemoveActivationDate" />
      </v-card>
    </v-bottom-sheet>



    <!-- <v-fab v-if="smAndDown && isAdmin" prepend-icon="mdi-file-plus-outline" class="fab" height="60px" rounded="0"
      location="bottom end" text="Tour de service" extended app color="onBackground"
      @click="showAddDialog = true"></v-fab> -->

    <ErrorDialog error-title="Impossible de supprimer ce tour de service" :error-message="errorMessage"
      error-icon="mdi-delete-alert-outline" :isDialogVisible="showErrorDialog"
      @update:dialogVisible="showErrorDialog = $event"></ErrorDialog>

    <ConfirmationDialog :isDialogVisible="showConfirmationDialog" :title="'Suppression du tour de service'"
      :text="'Êtes-vous sûr de vouloir supprimer ce tour de service ? Cette action est irréversible.'"
      :icon="'mdi-delete-outline'" :iconColor="'error'" :confirmText="'Supprimer'" @confirm="confirmDelete"
      @update:isDialogVisible="showConfirmationDialog = $event"></ConfirmationDialog>

    <ConfirmationDialog :isDialogVisible="showDateConfirmationDialog" :title="'Suppression de la date d\'activation'"
      :text="'Êtes-vous sûr de vouloir supprimer cette date d\'activation ? Cette action est irréversible.'"
       :iconColor="'error'" :confirmText="'Supprimer'" @confirm="removeActivationDate"
      @update:isDialogVisible="showDateConfirmationDialog = $event"></ConfirmationDialog>

    <AddRotation :modelValue="showAddDialog" :rotation="rotationToEdit" @rotationSubmit="saveRotation"
      @rotationEditSubmit="updateRotation" @rotationEditCancel="closeAddDialog" @update:modelValue="closeAddDialog">
    </AddRotation>

    <ActivateRotationDialog :isDialogVisible="showActivateDialog" :rotation="rotationToActivate" @onSubmit="setActivationDate"
      @update:dialogVisible="showActivateDialog = $event"></ActivateRotationDialog>


    <ConfirmChangeDialog :dialogVisible="showConfirmChangeDialog" :pendingActivation="pendingActivation" @confirm="confirmChange" @cancel="cancelActivation"
      @update:dialogVisible="showConfirmChangeDialog = $event"></ConfirmChangeDialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRotationStore } from '@/stores/rotationStore';
import { useCenterStore } from "@/stores/centerStore.js";
import { useAuthStore } from "@/stores/authStore.js";
import { useSnackbarStore } from "@/stores/snackbarStore";

import { useDisplay } from "vuetify";
import { useRouter } from 'vue-router';
import { toUTCNormalized } from '@/utils';
import SavedRotation from '@/components/Rotations/Information/SavedRotation.vue';

const { smAndDown } = useDisplay()
const centerStore = useCenterStore();
const authStore = useAuthStore()
const rotationStore = useRotationStore();

const snackbarStore = useSnackbarStore();
const selectedCenter = computed(() => authStore.userData.centerId);
const centers = computed(() => centerStore.centers);
const isAdmin = computed(() => authStore.userData.isAdmin);

const rotations = computed(() => rotationStore.rotations);
const sortedRotations = computed(() => rotationStore.sortedRotations);
const currentActive = computed(() => {
  if (!sortedRotations.value) return null;
  return sortedRotations.value.find(rotation => rotation.status === 'active') || null;
});

const isRotationActive = (rotation) => {
  return currentActive.value && currentActive.value._id === rotation._id;
};

const rotationToActivate = ref("")
const expandedRotations = ref({})

// Dialogs
const showAddDialog = ref(false);
const showActivateDialog = ref(false);
const showErrorDialog = ref(false);
const errorMessage = ref('');
const showConfirmationDialog = ref(false);
const rotationToDelete = ref(null);
const removeParams = ref({});
const showTimelineDrawer = ref(false);
const showDateConfirmationDialog = ref(false);
const showConfirmChangeDialog = ref(false);
const pendingActivation = ref({ rotation: null, date: null, changes: [] });

const router = useRouter();

const rotationToEdit = ref(null);

const selectedCenterId = ref(null);

const getDayStyle = (startTime, endTime) => {
  if (!startTime || !endTime) {
    return {
      overflow: 'visible',
      position: 'absolute',
    };
  }
  const containerHeight = 300;
  const totalMinutesInDay = 1440;

  const convertToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const startMinutes = convertToMinutes(startTime);
  const endMinutes = convertToMinutes(endTime);

  const minuteHeight = containerHeight / totalMinutesInDay;
  const top = startMinutes * minuteHeight;
  const height = (endMinutes - startMinutes) * minuteHeight;

  return {
    top: `${top}px`,
    overflow: 'visible',
    height: `${height}px`,
    position: 'absolute',
  };
}


const saveRotation = async (newRotation) => {
  try {
    newRotation.centerId = selectedCenterId.value;
    await rotationStore.saveRotation(newRotation);
    snackbarStore.showNotification('Tour de service créé', 'onPrimary', 'mdi-file-check-outline');
    closeAddDialog();
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la création du tour de service : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const updateRotation = async (updatedRotation) => {
  try {
    // S'assurer que nous avons l'ID et le centerId
    if (!updatedRotation._id || !updatedRotation.centerId) {
      throw new Error('Données de rotation invalides');
    }
    
    await rotationStore.updateRotation(updatedRotation._id, updatedRotation);
    snackbarStore.showNotification('Tour de service modifié', 'onPrimary', 'mdi-file-check-outline');
    closeAddDialog();
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la modification du tour de service : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
};

const handleSetActivationDate = (rotation) => {
  rotationToActivate.value = rotation;
  showActivateDialog.value = true
};

const handleRemoveActivationDate = (shiftId, date, centerId) => {
  console.log('handleRemoveActivationDate', shiftId, date, centerId);
  removeParams.value = {shiftId, date, centerId};
  showDateConfirmationDialog.value = true;
};



const deleteRotation = async (rotationId) => {
  rotationToDelete.value = rotationId;
  showConfirmationDialog.value = true;
};

const confirmDelete = async () => {
  try {
    await rotationStore.deleteRotation(rotationToDelete.value, selectedCenterId.value);
    snackbarStore.showNotification('Tour de service supprimé', 'onPrimary', 'mdi-check');
    showConfirmationDialog.value = false;
    rotationToDelete.value = null;
  } catch (error) {
    errorMessage.value = error.message;
    showErrorDialog.value = true;
  }
};

const setActivationDate = async (startDate) => {
  if (!startDate) {
    return;
  }
    try {
      const UTCDate = toUTCNormalized(startDate);
      const inputDate = UTCDate.split('T')[0];
      const result = await rotationStore.setActiveRotation(rotationToActivate.value, inputDate);

      if (result.needsApproval) {
        showConfirmChangeDialog.value = true;
        pendingActivation.value = { type: 'add', rotation: rotationToActivate.value, date: inputDate, changes: result.changes };
        return 
      } 
      onActivationSuccess(result);
    } catch (error) {
      snackbarStore.showNotification('Erreur lors de l\'ajout de la date d\'activation : ' + error.message, 'onError', 'mdi-alert-circle-outline');
    }
    
};




const removeActivationDate = async () => {
  const { date } = removeParams.value;
  if (!date) {
    return;
  }
    try {
      const UTCDate = toUTCNormalized(date);
      const inputDate = UTCDate.split('T')[0];
      const rotation = await rotationStore.rotations.find(rotation => rotation._id === removeParams.value.shiftId);
      const result = await rotationStore.removeActivationDate(rotation, inputDate, removeParams.value.centerId);

      console.log(rotation);

     
      if (result.needsApproval) {
        showConfirmChangeDialog.value = true;
        pendingActivation.value = { type: 'remove', rotation: rotation, date: inputDate, changes: result.changes };
        return 
      } 
      onActivationSuccess(result);
    } catch (error) {
      snackbarStore.showNotification('Erreur lors de l\'ajout de la date d\'activation : ' + error.message, 'onError', 'mdi-alert-circle-outline');
    }
};


const confirmChange = async () => {
  try {
    if (pendingActivation.value.type === 'add') {
      const result = await rotationStore.confirmAddActivation(pendingActivation.value.rotation, pendingActivation.value.date);
      onActivationSuccess(result);
    } else {
      const result = await rotationStore.confirmRemoveActivation(pendingActivation.value.rotation, pendingActivation.value.date);
      onActivationSuccess(result);
    }
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la confirmation du changement : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
}







const cancelActivation = () => {
  showConfirmChangeDialog.value = false;
  pendingActivation.value = { rotation: null, date: null, changes: [] };
}

const onActivationSuccess = (result) => {
  snackbarStore.showNotification(result.message, 'onSuccess', 'mdi-check');
  for (const change of result.changes) {
    snackbarStore.showNotification(buildChangeMessage(change), 'onSuccess', 'mdi-check');
  }
}


const buildChangeMessage = (change) => {
  let dateInterval = '';
  let ruleChange = '';
  if (change.to) {
    dateInterval = "du " + new Date(change.from).toLocaleDateString() + " au " + new Date(change.to).toLocaleDateString();
  } else {
    dateInterval = "à partir du " + new Date(change.from).toLocaleDateString();
  }

  

  return "Changement " + dateInterval + " : " + (change.oldRule ? change.oldRule : 'aucun tour de service actif') + " -> " + (change.newRule ? change.newRule : 'aucun tour de service actif');
}

const closeErrorDialog = () => {
  showErrorDialog.value = false;
};

const closeAddDialog = () => {
  showAddDialog.value = false;
  rotationToEdit.value = null;
};

const handleCalendarTransition = () => {
  router.push({
    path: '/parameter',
    meta: { transition: 'slide' }
  });
};

const handleEdit = (rotation) => {
  rotationToEdit.value = rotation;
  showAddDialog.value = true;
};

const handleCenterChange = async (centerId) => {
  try {
    if (centerId) {
      await rotationStore.fetchRotations(centerId);
    }
    snackbarStore.showNotification('Tours de service chargés', 'onPrimary', 'mdi-check');
  } catch (error) {
    console.error('Erreur lors du chargement des tours de service:', error);
    snackbarStore.showNotification('Erreur lors du chargement des tours de service', 'onError', 'mdi-alert-circle-outline');
  }
};

onMounted(async () => {
  try {
    await centerStore.fetchCenters();

    // Charger les rotations en fonction du type d'admin
    if (authStore.userData.adminType === 'master') {
      selectedCenterId.value = null;
    } else {
      await rotationStore.fetchRotations(authStore.userData.centerId);
      selectedCenterId.value = authStore.userData.centerId;
    }
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la récupération des tours de service : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
});

</script>

<style scoped>
.fab {
  padding-bottom: 24px !important;
  padding-right: 24px !important;
}

:deep(.fab > .v-fab__container > button) {
  border-radius: 16px !important;
}

:deep(.v-fab__container) {
  margin-right: 16px !important;
  margin-bottom: 96px !important;
}

.timeline-drawer {
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
}

.timeline-toggle-btn {
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 100;
}

:deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}
</style>
