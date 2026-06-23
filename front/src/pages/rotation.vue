<template>
  <v-container class="mb-16">
    <MainTitle
      title="Tours de service"
      subtitle="Créer, modifier et activer un tour de service"
    >
      <template #actions> 
        
      </template>
    </MainTitle>

 

     
      

    <v-row class="position-relative">
      <v-col
        cols="12"
        md="8"
      >
        <!-- Workshifts List -->

<template v-if="loading">
  <RotationItemSkeleton/>
</template>

<template v-else>
  <template v-if="rotations?.length>0">
 <RotationItem
          v-for="rotation in rotations"
          :key="rotation._id"
          :rotation="rotation"
          :is-active="isRotationActive(rotation)"
          :is-expanded="expandedRotations[rotation._id]"
          @set-activation-date="handleSetActivationDate"
          @delete="deleteRotation"
          @toggle-expand="(id) => expandedRotations[id] = !expandedRotations[id]"
          @edit="handleEdit" 
        />
  </template>
  <template v-else>
    <div class="d-flex ga-2 pa-4 align-center justify-center flex-column text-title-large">

      <v-icon size="24">mdi-tray-remove</v-icon>
      <span class=" text-disabled ">
     C'est vide
      </span>
 
    </div>
  </template>
       
</template>     

        <v-row class="mt-8">
          <v-col
            cols="12"
            lg="4"
            sm="4"
            xs="12"
            md="12"
          >
            <v-btn
              v-if="smAndDown"
              block
              class="justify-space-between"
              rounded="xl"
              color="surface"
              height="64"
              variant="flat"
              @click="showTimelineDrawer = !showTimelineDrawer"
            >
              <template #append>
                <v-icon color="primary">
                  mdi-chevron-right
                </v-icon>
              </template>
              <v-icon class="mr-4">
                mdi-timeline-clock
              </v-icon>
              Voir la timeline
            </v-btn>
          </v-col>
        </v-row>
      </v-col>

      <!-- Timeline -->
      <v-col
        cols="12"
        md="4"
      >
        <div
          v-if="!smAndDown"
          style="top:150px; position: sticky !important;"
        >
           <v-select
          v-if="authStore.userData.adminType === 'master'"
          v-model="selectedCenterId"
          :items="centers"
          :item-props="center => ({
            title: center.name,
            subtitle: center.oaci
          })"
          item-value="_id"
          label="Sélectionner un centre"
          variant="solo-filled"
          rounded="xl"
          class="mt-4"
          flat
          min-width="200px"
          max-width="300px"
          @update:model-value="handleCenterChange"
        />
          <v-btn
            v-if="isAdmin"
            class="mb-8"
            prepend-icon="mdi-file-plus-outline"
            color="onBackground"
            height="80px"
            width="100%"
            elevation="0"
            @click="showAddDialog = true"
          >
            Ajouter un tour de service
          </v-btn>
          <div class="d-flex flex-column mb-6">
            <span class="text-headline-small font-weight-medium">Timeline</span>
            <span class="text-title-small text-medium-emphasis">
              Timeline d'activation des tours de service
            </span>
          </div>
          <Timeline
            :current-active="currentActive"
            :sorted-rotations="sortedRotations"
            @remove-activation-date="handleRemoveActivationDate"
          />
        </div>
      </v-col>
    </v-row>

    <!-- Mobile Timeline Drawer -->
    <v-bottom-sheet
      v-if="smAndDown"
      v-model="showTimelineDrawer"
      location="bottom"
      temporary
      class="timeline-drawer"
    >
      <v-card
        class="pa-6"
        color="surfaceContainerHigh"
      >
        <div class="d-flex justify-space-between align-center mb-4">
          <div class="d-flex flex-column">
            <span class="text-headline-small font-weight-medium">Timeline</span>
            <span class="text-title-small text-medium-emphasis">
              Timeline d'activation des tours de service
            </span>
          </div>
        </div>
        <Timeline
          :current-active="currentActive"
          :sorted-rotations="sortedRotations"
          @remove-activation-date="handleRemoveActivationDate"
        />
      </v-card>
    </v-bottom-sheet>



    <!-- <v-fab v-if="smAndDown && isAdmin" prepend-icon="mdi-file-plus-outline" class="fab" height="60px" rounded="0"
      location="bottom end" text="Tour de service" extended app color="onBackground"
      @click="showAddDialog = true"></v-fab> -->

    <ErrorDialog
      error-title="Impossible de supprimer ce tour de service"
      :error-message="errorMessage"
      error-icon="mdi-delete-alert-outline"
      :is-dialog-visible="showErrorDialog"
      @update:dialog-visible="showErrorDialog = $event"
    />

    <ConfirmationDialog
      v-model="showConfirmationDialog"
      :title="'Suppression du tour de service'"
      :text="'Êtes-vous sûr de vouloir supprimer ce tour de service ? Cette action est irréversible.'"
      :icon="'mdi-delete-outline'"
      :icon-color="'error'"
      :confirm-text="'Supprimer'"
      @confirm="confirmDelete"
      @update:model-value="showConfirmationDialog = $event"
    />

    <ConfirmationDialog
      v-model="showDateConfirmationDialog"
      :title="'Suppression de la date d\'activation'"
      :text="'Êtes-vous sûr de vouloir supprimer cette date d\'activation ? Cette action est irréversible.'"
      :icon-color="'error'"
      :confirm-text="'Supprimer'"
      @confirm="removeActivationDate"
      @update:model-value="showDateConfirmationDialog = $event"
    />

    <AddRotation
      :model-value="showAddDialog"
      :rotation="rotationToEdit"
      @rotation-submit="saveRotation"
      @rotation-edit-submit="updateRotation" 
      @rotation-edit-cancel="closeAddDialog"
      @update:model-value="closeAddDialog"
    />

    <ActivateRotationDialog
      v-model="showActivateDialog"
      :rotationId="activateParams.rotationId"
      @on-submit="setActivationDate"
      @update:dialog-visible="showActivateDialog = $event"
    />


    <ConfirmChangeDialog
      :dialog-visible="showConfirmChangeDialog"
      :pending-activation="pendingActivation"
      @confirm="confirmChange"
      @cancel="cancelActivation"
      @update:dialog-visible="showConfirmChangeDialog = $event"
    />
  </v-container>
</template>

<script setup>
import { useRotationStore } from '@/stores/rotationStore';
import { useCenterStore } from "@/stores/centerStore.js";
import { useAuthStore } from "@/stores/authStore.js";
import { useSnackbarStore } from "@/stores/snackbarStore";

import { useDisplay } from "vuetify";
import { toUTCNormalized } from '@/utils';



const { smAndDown } = useDisplay()
const centerStore = useCenterStore();
const authStore = useAuthStore()
const rotationStore = useRotationStore();

const snackbarStore = useSnackbarStore();

const centers = computed(() => centerStore.centers);
const isAdmin = computed(() => authStore.userData.isAdmin);
const isMaster = computed(() => authStore.userData.adminType === 'master');

const selectedCenterId = ref(authStore.userData.centerId)

const loading = computed(() => rotationStore.loading)

const rotations = computed(() =>
  rotationStore.getRotationsForCenter(selectedCenterId.value)?.allRotations ?? []
)

const sortedRotations = computed(() =>
  rotationStore.getRotationsForCenter(selectedCenterId.value)?.sortedRotations ?? []
)

const currentActive = computed(() => {
  if (!sortedRotations.value) return null;
  return sortedRotations.value.find(rotation => rotation.status === 'active') || null;
});


const isRotationActive = (rotation) => {
  return currentActive.value && currentActive.value._id === rotation._id;
};

const activateParams = ref({})
const removeParams = ref({});

const expandedRotations = ref({})

// Dialogs
const showAddDialog = ref(false);
const showActivateDialog = ref(false);
const showErrorDialog = ref(false);
const errorMessage = ref('');
const showConfirmationDialog = ref(false);
const rotationToDelete = ref(null);

const showTimelineDrawer = ref(false);
const showDateConfirmationDialog = ref(false);
const showConfirmChangeDialog = ref(false);
const pendingActivation = ref({ rotation: null, date: null, changes: [], centerId : null });


const rotationToEdit = ref(null);


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

const handleSetActivationDate = (rotationId, date, centerId) => {
  activateParams.value =  {rotationId, date, centerId};
  showActivateDialog.value = true
};

const handleRemoveActivationDate = (rotationId, date, centerId) => {
  removeParams.value = {rotationId, date, centerId};
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
  const { date } = activateParams.value;
  if (!date) {
    return;
  }
    try {
      const UTCDate = toUTCNormalized(startDate);
      const inputDate = UTCDate.split('T')[0];
      const result = await rotationStore.setActiveRotation(activateParams.value.rotationId, inputDate, activateParams.value.centerId);

      if (result.needsApproval) {
        showConfirmChangeDialog.value = true;
        pendingActivation.value = { type: 'add', rotationId: activateParams.value.rotationId, date: inputDate, changes: result.changes, centerId : activateParams.value.centerId  };
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
   
      const result = await rotationStore.removeActivationDate(removeParams.value.rotationId, inputDate, removeParams.value.centerId);
     
      if (result.needsApproval) {
        showConfirmChangeDialog.value = true;
        pendingActivation.value = { type: 'remove', rotationId: removeParams.value.rotationId, date: inputDate, changes: result.changes, centerId : removeParams.value.centerId};
        return 
      } 
      onActivationSuccess(result);
    } catch (error) {
      snackbarStore.showNotification('Erreur lors de la suppression de la date : ' + error.message, 'onError', 'mdi-alert-circle-outline');
    }
};


const confirmChange = async () => {
  try {
    const { type, rotation, date, centerId } = pendingActivation.value;

    const result = type === 'add'
      ? await rotationStore.setActiveRotation(rotation, date, centerId, { confirm: true })
      : await rotationStore.removeActivationDate(rotation, date, centerId, { confirm: true });

    onActivationSuccess(result);
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la confirmation du changement : ' + error.message, 'onError', 'mdi-alert-circle-outline');
  }
};


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
  // const ruleChange = '';
  if (change.to) {
    dateInterval = "du " + new Date(change.from).toLocaleDateString() + " au " + new Date(change.to).toLocaleDateString();
  } else {
    dateInterval = "à partir du " + new Date(change.from).toLocaleDateString();
  }
  
  return "Changement " + dateInterval + " : " + (change.oldRule ? change.oldRule : 'aucun tour de service actif') + " -> " + (change.newRule ? change.newRule : 'aucun tour de service actif');
}


const closeAddDialog = () => {
  showAddDialog.value = false;
  rotationToEdit.value = null;
};


const handleEdit = (rotation) => {
  rotationToEdit.value = rotation;
  showAddDialog.value = true;
};

const handleCenterChange = async (centerId) => {
  selectedCenterId.value = centerId
  await rotationStore.fetchRotations(centerId)
}

onMounted(async () => {
  try {
    await centerStore.fetchCenters();
    
    await rotationStore.fetchRotations(authStore.userData.centerId);
    
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
