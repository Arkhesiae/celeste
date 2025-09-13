import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useInitializationStore = defineStore('initialization', () => {
  const isLoading = ref(false);
  const initializationState = ref({
    substitutions: false,
    centers: false,
    team: false,
    rotations: false,
    personal: false,
    users: false
  });

  const currentlyLoading = ref('');

  function setLoading(value) {
    isLoading.value = value;
  }

  watch(isLoading, (newVal) => {
    if (!newVal) {
      initializationState.value = {
        substitutions: false,
        centers: false,
        team: false,
        rotations: false,
        personal: false,
        users: false
      };
    }
  });

  function updateInitializationState(key, value) {
    initializationState.value[key] = value;
  }

  return {
    isLoading,
    initializationState,
    setLoading,
    updateInitializationState,
    currentlyLoading
  };
}); 