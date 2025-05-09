import { computed } from 'vue';

export function useSubstitutionManagement(substitutionStore) {
  const availableSubstitutions = computed(() => substitutionStore.availableSubstitutions);
  const acceptedSubstitutionsToDo = computed(() => substitutionStore.acceptedSubstitutionsToDo);
  const ownAcceptedSubstitutions = computed(() => substitutionStore.ownAcceptedSubstitutions);
  const ownPendingSubstitutions = computed(() => substitutionStore.ownPendingSubstitutions);

  const hasOwnOpenSubstitution = computed(() => (date) => {
    if (!date) return false;
    return ownPendingSubstitutions.value?.some(s => s.posterShift.date === date);
  });

  const hasAvailableSubstitution = computed(() => (date) => {
    if (!date) return false;
    return availableSubstitutions.value?.some(demand => {
      return demand.posterShift.date === date.toISOString();
    });
  });

  const getAvailableSubstitutionsCount = (date) => {
    if (!date) return 0;
    return availableSubstitutions.value?.filter(demand => demand.posterShift.date === date).length;
  };

  const hasAcceptedSubstitutionAsPoster = computed(() => (date) => {
    if (!date) return false;
    return ownAcceptedSubstitutions.value?.some(s => s.posterShift.date === date);
  });

  const hasAcceptedSubstitutionAsAccepter = computed(() => (date) => {
    if (!date) return false;
    return acceptedSubstitutionsToDo.value?.some(s => s.posterShift.date === date);
  });

  const getAvailableSwitchesCount = (date) => {
    // TODO: Implémenter la logique pour les switches
    return 0;
  };

  
  return {
    hasOwnOpenSubstitution,
    hasAvailableSubstitution,
    hasAcceptedSubstitutionAsPoster,
    hasAcceptedSubstitutionAsAccepter,
    getAvailableSubstitutionsCount,
    getAvailableSwitchesCount,
   
  };
} 