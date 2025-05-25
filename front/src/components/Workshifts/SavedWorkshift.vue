<template>
  <v-card class="mb-4 pa-4" rounded="xl" elevation="0">
    <v-card-item>
      <v-card-title class="text-h4">{{ rotation.name }}</v-card-title>
      <v-card-subtitle>Tour de service</v-card-subtitle>
      <template #append>
        <v-chip class="ml-3" color="primary" v-if="rotation.status === 'active'">Actif</v-chip>
        <v-menu location="bottom end" @click.stop v-if="isAdmin">
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" variant="text" color="default">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list rounded="xl" class="pa-4" bg-color="onBackground">
            <v-list-item @click="handleEdit(rotation)" prepend-icon="mdi-pencil">
              <v-list-item-title>Modifier</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('set-activation-date', rotation)"
              prepend-icon="mdi-clock-star-four-points-outline">
              <v-list-item-title>Programmer activation</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('delete', rotation._id)" prepend-icon="mdi-delete" color="error">
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

  <AddOrEditDay :isDialogVisible="showEditDayDialog" mode="edit" :day="selectedDay"
    @onSubmit="handleEditDay" @update:dialogVisible="showEditDayDialog = $event" />


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
</template>

<script setup>
import { ref, computed } from 'vue';
import DayList from "./visualization/DayList.vue";
import DayDetail from "./DayDetail.vue";
import { useDisplay } from 'vuetify';
import { useAuthStore } from "@/stores/authStore.js";
import AddOrEditDay from "./Dialogs/AddOrEditDay.vue";
import { useRotationStore } from "@/stores/rotationStore";
import { useSnackbarStore } from '@/stores/snackbarStore';

const authStore = useAuthStore();
const snackbarStore = useSnackbarStore();

const { smAndDown } = useDisplay();
const isAdmin = computed(() => authStore.isAdmin);
const showEditDayDialog = ref(false);
const showDayDetail = ref(false);
const selectedDay = ref(null);

const props = defineProps({
  rotation: {
    type: Object,
    required: true
  },
  isExpanded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['set-activation-date', 'delete', 'toggle-expand', 'edit']);

const rotationStore = useRotationStore();

const handleDayClick = (day) => {
  selectedDay.value = day;
  console.log(selectedDay.value);
  showDayDetail.value = true;
};

const handleEditDay = async (updatedDay) => {
  try {
  
    await rotationStore.updateDayInRotation(
      props.rotation._id,
      updatedDay,
      props.rotation.centerId
    );
    snackbarStore.showNotification("Jour modifié avec succès", "onPrimary");
    showEditDayDialog.value = false;
    showDayDetail.value = false;
  } catch (error) {
    console.error('Erreur lors de la mise à jour du jour :', error);
  }
};

const handleEdit = (rotation) => {
  emit('edit', { ...rotation });
};
</script>
