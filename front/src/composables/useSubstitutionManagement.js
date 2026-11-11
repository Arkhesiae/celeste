import { posterDay } from '@/utils/dayFields.js';
import { sameDateKey } from '@/utils/dateKey';


export function useSubstitutionManagement (substitutionStore) {
  const availableSubstitutions = computed(() => substitutionStore.availableSubstitutions);
  const acceptedSubstitutionsToDo = computed(() => substitutionStore.acceptedSubstitutionsToDo);
  const ownAcceptedSubstitutions = computed(() => substitutionStore.ownAcceptedSubstitutions);
  const ownPendingSubstitutions = computed(() => substitutionStore.ownPendingSubstitutions);

  const hasOwnOpenSubstitution = computed(() => (date) => {
    if (!date) return false;
    return ownPendingSubstitutions.value?.some(s => sameDateKey(posterDay(s), date));
  });

  const hasAvailableSubstitution = computed(() => (date) => {
    if (!date) return false;
    return availableSubstitutions.value?.some(demand => {
      return sameDateKey(posterDay(demand), date);
    });
  });

  const getAvailableSubstitutionsCount = (date) => {
    if (!date) return 0;
    return availableSubstitutions.value?.filter(demand => sameDateKey(posterDay(demand), date)).length;
  };

  const hasAcceptedSubstitutionAsPoster = computed(() => (date) => {
    if (!date) return false;
    return ownAcceptedSubstitutions.value?.some(s => sameDateKey(posterDay(s), date));
  });

  const hasAcceptedSubstitutionAsAccepter = computed(() => (date) => {
    if (!date) return false;
    return acceptedSubstitutionsToDo.value?.some(s => sameDateKey(posterDay(s), date));
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