import { useRotationStore } from "@/stores/rotationStore";
import { useAuthStore } from "@/stores/authStore";


// useCenterRotations.js
export function useCenterRotations() {
  const rotationStore = useRotationStore();
  const authStore = useAuthStore();

  const selectedCenterId = ref(authStore.userData.centerId); // pre-init to own center
  const browsedRotations = ref({ allRotations: [], sortedRotations: [] });
  const loading = ref(false);

  const isMaster = computed(() => authStore.userData.adminType === 'master');

  const fetchForCenter = async (centerId) => {
    loading.value = true;
    try {
      await rotationStore.fetchRotations(centerId);   // store does the API call
      selectedCenterId.value = centerId;
    } finally {
      loading.value = false;
    }
  };

  // Single computed that both roles read from — always the store
  const rotations = computed(() => rotationStore.rotations);
  const sortedRotations = computed(() => rotationStore.sortedRotations);

  return { rotations, sortedRotations, selectedCenterId, loading, fetchForCenter };
}