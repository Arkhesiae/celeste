import { ref, computed, watch, reactive } from 'vue';
import { defineStore } from 'pinia';
import { vacationService } from '@/services/vacationService';
import { useAuthStore } from '@/stores/authStore';
import { parseShiftDateTime } from '@/utils/parseShiftDateTime';
import { useSubstitutionStore } from '@/stores/substitutionStore';

/**
 * Store Pinia pour gérer l'état des vacations.
 * Ce store gère toutes les opérations liées aux vacations, y compris :
 * - La récupération des vacations d'un utilisateur
 * - La gestion de la période de visualisation
 * - Le suivi des vacations adjacentes
 * 
 * @module shiftStore
 */
export const useShiftStore = defineStore('shift', () => {
  const period = ref({
    startDate: null,
    endDate: null
  });
  const loading = ref(false);
  const error = ref(null);

  const shiftsWithSubstitutions = ref([]);
  const authStore = useAuthStore();
  const userId = computed(() => authStore.userId);

  // Cache persistant pour les vacations
  const persistentVacationsMap = ref(new Map([]));



  /**
  * Ajoute ou remplace une entrée dans la Map persistante
  * Déclenche un callback uniquement si l'entrée est modifiée (overwrite)
  *
  * @param {string} dateKey - La clé de date (YYYY-MM-DD)
  * @param {object} newValue - L'objet shift à insérer
  */
  const setEntryWithDetection = (dateKey, newValue, callback) => {
    const map = persistentVacationsMap.value;

    if (map.has(dateKey)) {
      const oldValue = map.get(dateKey);
      const oldSerialized = JSON.stringify(oldValue);
      const newSerialized = JSON.stringify(newValue);

      if (oldSerialized !== newSerialized) {
        // Overwrite détecté
        console.log('✅ Overwrite détecté pour', dateKey);
        console.log({ oldValue, newValue });
        triggerRecategorize(dateKey);
      }
    }

    map.set(dateKey, newValue); // Ajout ou remplacement
  };

  const triggerRecategorize = (dateKey) => {
    const substitutionStore = useSubstitutionStore();
    substitutionStore.recategorizeSubstitutions(dateKey);
  }




  const addEntry = (entry, dateKey = null) => {
    if (!entry || !entry.date) return;

    if (!dateKey) {
      dateKey = entry.date.split('T')[0];
    }

    const { date, shift, teamObject, isSubstitution, substitutionType, initialShift, substitutionHistory } = entry;

    let start = null;
    let end = null;
    let startTime = shift?.default?.startTime ? shift?.default?.startTime : shift?.startTime;
    let endTime = shift?.default?.endTime ? shift?.default?.endTime : shift?.endTime;
    if (shift && shift.type !== 'rest') {
      if (!date || !shift || !startTime || !endTime ) {
        return;
      }

      start = parseShiftDateTime(date, startTime, shift.endsNextDay);
      end = parseShiftDateTime(date, endTime, shift.endsNextDay);
    }

    const newValue = {
      shift,
      teamObject,
      start,
      end,
      isSubstitution: isSubstitution || false,
      substitutionType: substitutionType || null,
      initialShift: initialShift || null,
      substitutionHistory: substitutionHistory || []
    };

    persistentVacationsMap.value.set(dateKey, newValue);
  };

  // Getters utiles
  const hasShifts = computed(() => shiftsWithSubstitutions.value.length > 0);

  const getShiftForDate = (date) => {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    return userVacations.value.get(dateStr);
  };

  const getShiftsForPeriod = (startDate, endDate) => {
    const shifts = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const shift = userVacations.value.get(dateStr);
      if (shift) {
        shifts.push({ date: dateStr, ...shift });
      }
    }

    return shifts;
  };


  const fetchShiftsWithSubstitutions = async (dates) => {
    if (!userId.value) {
      return;
    }

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
          let startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          let endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          dates = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          };
        }
      }

      const newShifts = await vacationService.fetchVacationsOfUser(userId.value, dates);
      newShifts.forEach((shiftData) => {
        addEntry(shiftData);
      }); 

      shiftsWithSubstitutions.value = newShifts;

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
    period,
    loading,
    error,
    shiftsWithSubstitutions,
    persistentVacationsMap,

    // Computed

    hasShifts,

    // Actions
    fetchShiftsWithSubstitutions,
    fetchWorkdays,
    getAdjacentVacations,

    // Getters
    getShiftForDate,
    getShiftsForPeriod,

    // Watchers
    setEntryWithDetection,
    addEntry,
  };
}); 