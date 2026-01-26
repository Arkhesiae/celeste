import { defineStore } from 'pinia';


export const useInitializationStore = defineStore('initialization', () => {
  const isLoading = ref(false);
  const initializationState = ref({
    substitutions: false,
    centers: false,
    team: false,
    rotations: false,
    shifts: false,
    personal: false,
    users: false,
    tickets: false
  });

  const isAppReady = ref(false);
  const lastLoaded = ref('');
  const pendingRoute = ref('');

  function setLoading (value) {
    isLoading.value = value;
  }

  function setAppReady (value) {
    isAppReady.value = value;
  }

  function getPendingRoute () {
    return pendingRoute.value;
  }

  function setPendingRoute (route) {
    pendingRoute.value = route;
  }

  watch(isLoading, (newVal) => {
    if (!newVal) {
      initializationState.value = {
        substitutions: false,
        centers: false,
        tickets: false,
        team: false,
        rotations: false,
        shifts: false,
        personal: false,
        users: false
      };
    }
  });

  function updateInitializationState (key, value) {
    initializationState.value[key] = value;
    lastLoaded.value = key;
  }

  return {
    isLoading,
    isAppReady,
    getPendingRoute,
    setPendingRoute,
    setAppReady,
    initializationState,
    setLoading,
    updateInitializationState,
    lastLoaded
  };
}); 