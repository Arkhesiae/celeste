<template>
  <v-card class="mb-4 pa-4" elevation="0" :class="{ 'active-rotation': isActive, 'new-rotation': neverActivated }">
    <v-card-item>
      <div class="d-flex align-center">
        <template v-if="!smAndDown && isEditing">
          <v-text-field
            ref="nameInput"
            v-model="editedName"
            variant="underlined"
            max-width="300px"
            hide-details
            @blur="handleNameEdit"
            @keyup.enter="handleNameEdit"
          />
        </template>
        <template v-else>
          <v-card-title class="flex-shrink-1" :class="smAndDown ? 'text-title-large' : 'text-headline-large'">
            {{ rotation.name }}
          </v-card-title>
        </template>
        <v-btn
          v-if="isAdmin && !isEditing"
          icon
          variant="text"
          size="small"
          color="default"
          class="ml-2"
          @click="startEditing"
        >
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </div>
      <v-card-subtitle>Tour de service</v-card-subtitle>
      <template #append>
        <v-chip v-if="isActive" class="ml-3" color="primary" rounded="lg"> Actif </v-chip>
        <v-chip v-if="neverActivated" class="ml-3" color="secondary" rounded="lg" prepend-icon="mdi-new-box">
          Jamais activé
          <v-tooltip activator="parent" location="top" text="Ses jours sont librement modifiables" />
        </v-chip>
        <v-menu v-if="isAdmin" location="bottom end" @click.stop>
          <template #activator="{ props }">
            <v-btn icon v-bind="props" variant="text" color="default">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-list>
              <v-list-item prepend-icon="mdi-content-copy" @click="handleDuplicate(rotation)">
                <v-list-item-title>Dupliquer</v-list-item-title>
              </v-list-item>
              <v-list-item
                prepend-icon="mdi-clock-star-four-points-outline"
                @click="$emit('set-activation-date', rotation)"
              >
                <v-list-item-title>Programmer activation</v-list-item-title>
              </v-list-item>
              <v-list-item prepend-icon="mdi-delete" color="error" @click="$emit('delete', rotation._id)">
                <v-list-item-title>Supprimer</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
        <v-btn icon variant="text" color="default" @click.stop="$emit('toggle-expand', rotation._id)">
          <v-icon :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
        </v-btn>
      </template>
    </v-card-item>
    <v-alert
      v-if="teamCountMismatch"
      type="warning"
      density="compact"
      rounded="lg"
      class="mx-4 mb-2"
      icon="mdi-alert-outline"
    >
      Ce tour de {{ rotation.days?.length ?? 0 }} jour(s) ne correspond pas aux {{ teamsCount }} équipe(s) du centre :
      il faut autant d'équipes que de jours.
    </v-alert>
    <v-expand-transition>
      <div v-show="isExpanded" style="height: auto">
        <DayList class="cursor-pointer" :rotation="rotation.days" @day-click="handleDayClick" />
      </div>
    </v-expand-transition>
  </v-card>

  <AddOrEditDay
    :model-value="showEditDayDialog"
    mode="edit"
    :day="selectedDay"
    @on-submit="handleQuickDayEdit"
    @update:model-value="showEditDayDialog = $event"
  />

  <ConfirmationDialog
    v-model="showDayConfirmation"
    title="Modifier un tour déjà activé ?"
    :text="dayConfirmationText"
    icon="mdi-alert-outline"
    confirm-text="Modifier quand même"
    confirm-color="error"
    @confirm="confirmDayEdit"
    @cancel="pendingDay = null"
  />

  <!-- Desktop Dialog -->
  <v-dialog v-if="!smAndDown" v-model="showDayDetail" max-width="400">
    <DayDetail
      rounded="xl"
      :is-mobile="smAndDown"
      :day="selectedDay"
      :deletable="false"
      @close="showDayDetail = false"
      @on-edit="showEditDayDialog = true"
    />
  </v-dialog>

  <!-- Mobile Bottom Sheet -->
  <v-bottom-sheet v-if="smAndDown" v-model="showDayDetail">
    <DayDetail
      :is-mobile="smAndDown"
      :day="selectedDay"
      :deletable="false"
      @close="showDayDetail = false"
      @on-edit="showEditDayDialog = true"
    />
  </v-bottom-sheet>

  <!-- Edit Name Dialog -->
  <EditRotationNameDialog
    v-if="smAndDown"
    :is-dialog-visible="showEditNameDialog"
    :rotation="rotation"
    @update:dialog-visible="showEditNameDialog = $event"
    @on-submit="handleNameEdit"
  />
</template>

<script setup>
import { useDisplay } from 'vuetify';
import { useAuthStore } from '@/stores/authStore.js';
import { useRotationStore } from '@/stores/rotationStore';
import { useSnackbarStore } from '@/stores/snackbarStore';

const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

const { smAndDown } = useDisplay();
const isAdmin = computed(() => authStore.userData.isAdmin);
const showEditDayDialog = ref(false);
const showDayDetail = ref(false);
const selectedDay = ref(null);
const showEditNameDialog = ref(false);
const isEditing = ref(false);
const editedName = ref('');
const nameInput = ref(null);
const showDayConfirmation = ref(false);
const dayConfirmationText = ref('');
const pendingDay = ref(null);

const props = defineProps({
  rotation: {
    type: Object,
    required: true,
  },
  isExpanded: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  /** Nombre d'équipes du centre ; null tant qu'il est inconnu (aucun avertissement) */
  teamsCount: {
    type: Number,
    default: null,
  },
});

// Autant d'équipes que de jours dans le tour de service
const teamCountMismatch = computed(
  () => props.teamsCount !== null && (props.rotation.days?.length ?? 0) !== props.teamsCount,
);

// Jamais activé : aucune date d'activation, passée ou à venir
// TEMPORARY(day-fields): le repli sur `activationDates` disparaît avec l'ancien champ
const neverActivated = computed(() => !(props.rotation.activationDays?.length || props.rotation.activationDates?.length));

defineEmits(['set-activation-date', 'delete', 'toggle-expand', 'edit']);

const rotationStore = useRotationStore();

const handleDayClick = (day) => {
  selectedDay.value = day;
  showDayDetail.value = true;
};

const handleQuickDayEdit = async (updatedDay, { confirm = false } = {}) => {
  try {
    const result = await rotationStore.updateDayInRotation(props.rotation._id, updatedDay, props.rotation.centerId, {
      confirm,
    });
    if (result?.needsApproval) {
      pendingDay.value = updatedDay;
      dayConfirmationText.value = result.message;
      showDayConfirmation.value = true;
      return;
    }
    snackbarStore.showNotification('Jour modifié', 'onPrimary', 'mdi-check');
    showEditDayDialog.value = false;
    showDayDetail.value = false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du jour :', error);
    snackbarStore.showNotification(
      error.message || 'Erreur lors de la modification du jour',
      'onError',
      'mdi-alert-circle-outline',
    );
  }
};

const confirmDayEdit = async () => {
  const day = pendingDay.value;
  pendingDay.value = null;
  if (day) await handleQuickDayEdit(day, { confirm: true });
};

const handleDuplicate = async (rotation) => {
  try {
    await rotationStore.duplicateRotation(rotation._id, rotation.centerId);
    snackbarStore.showNotification('Tour de service dupliqué avec succès', 'onPrimary', 'mdi-check');
  } catch {
    snackbarStore.showNotification(
      'Erreur lors de la duplication du tour de service',
      'onError',
      'mdi-alert-circle-outline',
    );
  }
};

const startEditing = () => {
  if (smAndDown.value) {
    showEditNameDialog.value = true;
  } else {
    isEditing.value = true;
    editedName.value = props.rotation.name;
    nextTick(() => {
      nameInput.value?.focus();
    });
  }
};

const handleNameEdit = async (updatedRotation) => {
  try {
    const newName = smAndDown.value ? updatedRotation.name : editedName.value;
    if (!newName || newName === props.rotation.name) {
      isEditing.value = false;
      return;
    }
    await rotationStore.updateRotation(props.rotation._id, {
      ...props.rotation,
      name: newName,
    });
    isEditing.value = false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du nom :', error);
    snackbarStore.showNotification('Erreur lors de la modification du nom', 'onError');
  }
};
</script>

<style scoped>
.new-rotation {
  border: 2px dashed rgba(var(--v-theme-secondary), 0.7);
}

.active-rotation {
  position: relative;
}

.active-rotation::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.15) 0%,
    rgba(var(--v-theme-surfaceContainerHighest), 0.25) 80%
  );
  pointer-events: none;
  z-index: 0;
}
</style>
