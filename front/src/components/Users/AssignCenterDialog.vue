<template>
  <v-dialog :model-value="dialogVisible" @update:model-value="$emit('update:dialogVisible', $event)" max-width="500">
    <v-card class="pa-6" rounded="xl">
      <v-card-title class="pa-0 ma-0 mb-4">Changement de centre</v-card-title>
      <v-card-text class="pa-0 ma-0">
        <v-select
          rounded="lg"
          v-model="selectedCenter"
          :items="centers"
          :reduce="center => center._id"
          item-title='name'
          item-value="_id"
          variant="outlined"
          label="Sélectionner un centre"
          dense
        />
      </v-card-text>
      <v-card-actions class="pa-0 ma-0">
        <v-btn text @click="$emit('update:dialogVisible', false)">Annuler</v-btn>
        <v-btn text @click="handleAssignCenter">Assigner</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useCenterStore } from '@/stores/centerStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useUserStore } from '@/stores/userStore';
const centerStore = useCenterStore();
const userStore = useUserStore();
const snackbarStore = useSnackbarStore();

const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true
  },
  userId: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:dialogVisible', 'centerAssigned']);

const selectedCenter = ref(null);

const centers = computed(() => centerStore.centers);
const user = computed(() => userStore.users.find(user => user._id === props.userId) || null);

// Réinitialiser la sélection quand l'utilisateur change
watch(() => props.userId, (newUserId) => {
  if (newUserId) {
    selectedCenter.value = user.value?.centerId;
  }
}, { immediate: true });

const handleAssignCenter = async () => {
  if (!selectedCenter.value || !user.value) return;

  try {
    emit('centerAssigned', {
      userId: user.value._id,
      centerId: selectedCenter.value
    });
    emit('update:dialogVisible', false);
    snackbarStore.showNotification('Centre assigné', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error assigning center:', error);
    snackbarStore.showNotification('Erreur lors de l\'assignation du centre', 'onError', 'mdi-alert-circle');
  }
};
</script> 