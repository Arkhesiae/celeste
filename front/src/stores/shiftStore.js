import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { vacationService } from '@/services/vacationService';
import { useAuthStore } from '@/stores/authStore';

/**
 * Store Pinia pour gérer l'état des vacations.
 * Ce store gère toutes les opérations liées aux vacations, y compris :
 * - La récupération des vacations d'un utilisateur
 * - La gestion de la période de visualisation
 * - Le suivi des vacations adjacentes
 * 
 * @module vacationStore
 */
export const useShiftStore = defineStore('shift', () => {

  const vacations = ref([]);
  const period = ref({
    startDate: null,
    endDate: null
  });
  const loading = ref(false);
  const error = ref(null);

  const shiftsWithSubstitutions = ref([]);
  const authStore = useAuthStore();
  const userId = computed(() => authStore.userId);


  const hasVacationOnDate = computed(() => {
    return (date) => {
      if (!vacations.value?.length) return false;
      return vacations.value.some(vacation => 
        vacation.date === date
      );
    };
  });

  const fetchShiftsWithSubstitutions = async (dates) => {
    if (!userId.value) return;
    
    loading.value = true;
    try {
      error.value = null;
      if (!dates) {
        if (period.value.startDate && period.value.endDate) {
        dates = {
            startDate: period.value.startDate,
            endDate: period.value.endDate
          };
        } else {
          let startDate = new Date();
          let endDate = startDate.setMonth(startDate.getMonth() + 1);
          dates = {
            startDate: startDate,
            endDate: endDate
          };
        }
      }

      console.log(dates);

      const fetchedShiftsWithSubstitutions = await vacationService.fetchVacationsOfUser(userId.value, dates);
      shiftsWithSubstitutions.value = fetchedShiftsWithSubstitutions;
      console.log(shiftsWithSubstitutions.value);
      period.value = {
        startDate: dates.startDate,
        endDate: dates.endDate
      };
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des vacations';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchWorkdays = async (dates) => {
    if (!userId.value) return;
    
    loading.value = true;
    try {
      error.value = null;
      const workdays = await vacationService.fetchWorkdaysOfUser(userId.value, dates);
      return workdays;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des jours de travail';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getAdjacentVacations = async (date) => {
    if (!userId.value || !date) return { prev: null, next: null };
    
    loading.value = true;
    try {
      error.value = null;
      return await vacationService.getAdjacentVacations(userId.value, date);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des vacations adjacentes';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    vacations,
    period,
    loading,
    error,
    shiftsWithSubstitutions,

    // Computed
    hasVacationOnDate,

    // Actions
    fetchShiftsWithSubstitutions,
    fetchWorkdays,
    getAdjacentVacations
  };
}); 