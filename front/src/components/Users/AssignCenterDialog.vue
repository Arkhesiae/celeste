<template>
  <BaseDialog v-model="modelValue" title="Changement de centre" :max-width="500">
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
      <v-btn variant="text" @click="modelValue = false">Annuler</v-btn>
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
  userId: {
    type: String,
    default: null,
  },
});

const modelValue = defineModel({ type: Boolean, required: true });

const emit = defineEmits(['centerAssigned']);

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
    modelValue.value = false;
    snackbarStore.showNotification('Centre assigné', 'onSuccess', 'mdi-check-circle');
  } catch (error) {
    console.error('Error assigning center:', error);
    snackbarStore.showNotification("Erreur lors de l'assignation du centre", 'onError', 'mdi-alert-circle');
  }
};
</script>
