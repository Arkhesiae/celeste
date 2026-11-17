<template>
  <BaseDialog
    :model-value="dialogVisible"
    title="Changement de centre"
    :max-width="500"
    @update:model-value="$emit('update:dialogVisible', $event)"
  >
    <v-select
      v-model="selectedCenter"
      rounded="lg"
      :items="centers"
      item-title="name"
      item-value="_id"
      variant="outlined"
      label="Sélectionner un centre"
      hide-details
    />

    <template #actions>
      <v-spacer />
      <v-btn variant="text" @click="$emit('update:dialogVisible', false)">Annuler</v-btn>
      <v-btn @click="handleAssignCenter">Assigner</v-btn>
    </template>
  </BaseDialog>
</template>

<script setup>
import { useCenterStore } from '@/stores/centerStore';
import { useSnackbarStore } from '@/stores/snackbarStore';
import { useUserStore } from '@/stores/userStore';
const centerStore = useCenterStore();
const userStore = useUserStore();
const snackbarStore = useSnackbarStore();

const props = defineProps({
  dialogVisible: {
    type: Boolean,
    required: true,
  },
  userId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['update:dialogVisible', 'centerAssigned']);

const selectedCenter = ref(null);

const centers = computed(() => centerStore.centers);
const user = computed(() => userStore.users.find((user) => user._id === props.userId) || null);

// Réinitialiser la sélection quand l'utilisateur change
watch(
  () => props.userId,
  (newUserId) => {
    if (newUserId) {
      selectedCenter.value = user.value?.centerId;
    }
  },
  { immediate: true },
);

const handleAssignCenter = async () => {
  if (!selectedCenter.value || !user.value) return;

  try {
    emit('centerAssigned', {
      userId: user.value._id,
      centerId: selectedCenter.value,
    });
    emit('update:dialogVisible', false);
    snackbarStore.showNotification('Centre assigné', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error assigning center:', error);
    snackbarStore.showNotification("Erreur lors de l'assignation du centre", 'onError', 'mdi-alert-circle');
  }
};
</script>
