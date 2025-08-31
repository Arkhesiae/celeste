<template>
  <v-card class="mb-4 pa-4" rounded="xl" elevation="0" :class="{ 'active-rotation': isActive }">
    <v-card-item>
      <div class="d-flex align-center">
        <template v-if="!smAndDown && isEditing">
          <v-text-field v-model="editedName" variant="underlined" max-width="300px" hide-details @blur="handleNameEdit"
            @keyup.enter="handleNameEdit" ref="nameInput"></v-text-field>
        </template>
        <template v-else>
          <v-card-title class="flex-shrink-1" :class="smAndDown ? 'text-h6' : 'text-h4'">{{ rotation.name
            }}</v-card-title>
        </template>
        <v-btn v-if="isAdmin && !isEditing" icon variant="text" size="small" color="default" class="ml-2"
          @click="startEditing">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
      </div>
      <v-card-subtitle>Tour de service</v-card-subtitle>
      <template #append>
        <v-chip class="ml-3" color="remplacement" rounded="lg" v-if="isActive">Actif</v-chip>
        <v-menu location="bottom end" @click.stop v-if="isAdmin">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" variant="text" color="default">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list rounded="xl" class="pa-4" bg-color="onBackground">
            <!-- <v-list-item @click="handleEdit(rotation)" prepend-icon="mdi-pencil" rounded="lg">
              <v-list-item-title>Modifier</v-list-item-title>
            </v-list-item> -->
            <v-list-item @click="handleDuplicate(rotation)" prepend-icon="mdi-content-copy" rounded="lg">
              <v-list-item-title>Dupliquer</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('set-activation-date', rotation)"
              prepend-icon="mdi-clock-star-four-points-outline" rounded="lg">
              <v-list-item-title>Programmer activation</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('delete', rotation._id)" prepend-icon="mdi-delete" color="error" rounded="lg">
              <v-list-item-title>Supprimer</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <v-btn icon variant="text" color="default" @click.stop="$emit('toggle-expand', rotation._id)">
          <v-icon :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"></v-icon>
        </v-btn>
      </template>
    </v-card-item>
    <v-expand-transition>
      <div v-show="isExpanded" style="height: auto">
        <DayList class="cursor-pointer" :rotation="rotation.days" @day-click="handleDayClick" />
      </div>
    </v-expand-transition>
  </v-card>

  <AddOrEditDay :modelValue="showEditDayDialog" mode="edit" :day="selectedDay" @onSubmit="handleQuickDayEdit"
    @update:modelValue="showEditDayDialog = $event" />

  <!-- Desktop Dialog -->
  <v-dialog v-if="!smAndDown" v-model="showDayDetail" max-width="400">
    <DayDetail rounded="xl" :is-mobile="smAndDown" :day="selectedDay" :deletable="false" @close="showDayDetail = false"
      @onEdit="showEditDayDialog = true" />
  </v-dialog>

  <!-- Mobile Bottom Sheet -->
  <v-bottom-sheet v-if="smAndDown" v-model="showDayDetail">
    <DayDetail :is-mobile="smAndDown" :day="selectedDay" :deletable="false" @close="showDayDetail = false"
      @onEdit="showEditDayDialog = true" />
  </v-bottom-sheet>

  <!-- Edit Name Dialog -->
  <EditRotationNameDialog v-if="smAndDown" :is-dialog-visible="showEditNameDialog" :rotation="rotation"
    @update:dialogVisible="showEditNameDialog = $event" @onSubmit="handleNameEdit" />
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useDisplay } from 'vuetify';
import { useAuthStore } from "@/stores/authStore.js";
import { useRotationStore } from "@/stores/rotationStore";
import { useSnackbarStore } from '@/stores/snackbarStore';

const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

const { smAndDown } = useDisplay();
const isAdmin = computed(() => authStore.isAdmin);
const showEditDayDialog = ref(false);
const showDayDetail = ref(false);
const selectedDay = ref(null);
const showEditNameDialog = ref(false);
const isEditing = ref(false);
const editedName = ref('');
const nameInput = ref(null);

const props = defineProps({
  rotation: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['set-activation-date', 'delete', 'toggle-expand', 'edit']);

const rotationStore = useRotationStore();

const handleDayClick = (day) => {
  selectedDay.value = day;
  showDayDetail.value = true;
};

const handleQuickDayEdit = async (updatedDay) => {
  try {
    await rotationStore.updateDayInRotation(
      props.rotation._id,
      updatedDay,
      props.rotation.centerId
    );
    snackbarStore.showNotification("Jour modifié", "onPrimary", "mdi-check");
    showEditDayDialog.value = false;
    showDayDetail.value = false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du jour :', error);
  }
};

const handleEdit = (rotation) => {
  emit('edit', { ...rotation });
};

const handleDuplicate = async (rotation) => {
  try {
    await rotationStore.duplicateRotation(rotation._id, rotation.centerId);
    snackbarStore.showNotification('Tour de service dupliqué avec succès', 'onPrimary', 'mdi-check');
  } catch (error) {
    snackbarStore.showNotification('Erreur lors de la duplication du tour de service', 'onError', 'mdi-alert-circle-outline');
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
      name: newName
    });
    isEditing.value = false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du nom :', error);
    snackbarStore.showNotification("Erreur lors de la modification du nom", "onError");
  }
};
</script>

<style scoped>
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
  background: linear-gradient(135deg, rgba(var(--v-theme-remplacement), 0.15) 0%, rgba(var(--v-theme-surfaceContainerHighest), 0.25) 80%);
  pointer-events: none;
  z-index: 0;
}
</style>
