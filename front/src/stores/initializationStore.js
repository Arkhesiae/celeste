import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useInitializationStore = defineStore('initialization', () => {
  const isLoading = ref(false);
  const initializationState = ref({
    substitutions: false,
    center: false,
    team: false,
    rotations: false,
    personal: false
  });
  const currentlyLoading = ref('');

  function setLoading(value) {
    isLoading.value = value;
  }

  function updateInitializationState(key, value) {
    initializationState.value[key] = value;
  }

  return {
    isLoading,
    initializationState,
    setLoading,
    updateInitializationState
  };
}); 