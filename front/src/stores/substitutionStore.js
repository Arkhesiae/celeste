import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { substitutionService } from '@/services/substitutionService';
import { useAuthStore } from '@/stores/authStore';
/**
 * Store Pinia pour gérer l'état des substitutions.
 * @module substitutionStore
 */
export const useSubstitutionStore = defineStore('substitution', () => {
  // State
  const substitutions = ref([]);
  const currentSubstitution = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const startDate = ref(null);
  const endDate = ref(null);

  const authStore = useAuthStore();
  const userId = computed(() => authStore.userId);


  // OPEN SUBSTITUTIONS
  const availableSubstitutions = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' && 
      substitution.posterId !== userId.value &&
      substitution.limit !== 'alreadyWorking'
    );
  });

   // OPEN SUBSTITUTIONS
   const availableSwitches = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' && 
      substitution.posterId !== userId.value &&
      substitution.canSwitch
    );
  });

  const getAvailableSubstitutionsCount = (date) => {
    if (!date) return 0;
    return availableSubstitutions.value?.filter(demand => demand.posterShift.date === date).length;
  };

  const getAvailableSwitchesCount = (date) => {
    if (!date) return 0;
    return availableSwitches.value?.filter(demand => demand.posterShift.date === date).length;
  };

  // ACCEPTED SUBSTITUTIONS
  const allAcceptedSubstitutions = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'accepted'
    );
  });

  // ACCEPTED SUBSTITUTIONS WHERE USER IS REPLACED
  const ownAcceptedSubstitutions = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'accepted' && 
      substitution.posterId === userId.value
    );
  });

   // OPEN SUBSTITUTIONS WHERE USER IS REPLACED
   const ownPendingSubstitutions = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' && 
      substitution.posterId === userId.value
    );
  });


  // SUBSTITUTIONS WHERE USER IS REPLACER
  const acceptedSubstitutionsToDo = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'accepted' && 
      substitution.accepterId === userId.value
    );
  });

  const hasOwnOpenSubstitutions = computed(() => (date) => {
    if (!date) return false;
    if (ownPendingSubstitutions.value?.some(s => s.posterShift.date === date)) {
      return ownPendingSubstitutions.value?.find(s => s.posterShift.date === date);
    } 
    return false;
  });

  const hasAvailableSubstitutions = computed(() => (date) => {
    if (!date) return false;
    return availableSubstitutions.value?.some(demand => {
      return demand.posterShift.date === date.toISOString();
    });
  });

  const hasAvailableSwitches = computed(() => (date) => {
    if (!date) return false;
    return availableSwitches.value?.some(demand => {
      return demand.posterShift.date === date.toISOString();
    });
  });

  const hasAcceptedSubstitutionsAsPoster = computed(() => (date) => {
    if (!date) return false;
    return ownAcceptedSubstitutions.value?.find(s => s.posterShift.date === date);
  });

  const hasAcceptedSubstitutionsAsAccepter = computed(() => (date) => {
    if (!date) return false;
    return acceptedSubstitutionsToDo.value?.find(s => s.posterShift.date === date);
  });

 

    /**
   * Récupère toutes les substitutions ouvertes ou acceptées.
   * @param {Array} dates - Tableau contenant la date de début et de fin [startDate, endDate]
   * @returns {Promise<Array>} Liste des substitutions filtrées
   */
    const getAllSubstitutions = async (dates) => {
      return substitutions.value.filter(substitution => substitution.status === 'open' || substitution.status === 'accepted');
    };
  


  /**
   * Récupère une substitution par son ID.
   * @param {string} substitutionId - L'ID de la substitution.
   */
  const fetchSubstitutionById = async (substitutionId) => {
    try {
      loading.value = true;
      error.value = null;
      currentSubstitution.value = await substitutionService.getSubstitutionById(substitutionId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération de la substitution';
      throw err;
    } finally {
      loading.value = false;
    }
  };
  
  /**
   * Récupère et marque les demandes d'un centre comme vues.
   * @param {Array} dates - Dates de la période à récupérer
   * @param {string} [status] - Statut des demandes à filtrer (optionnel)
   */
  const fetchDemands = async (dates, status) => {
    loading.value = true;
    try {
      const demands = await substitutionService.fetchAndMarkAsSeen(dates, status);
      startDate.value = dates.startDate;
      endDate.value = dates.endDate;
      return demands;
    } catch (err) {
      error.value = err.message;
      console.error('Erreur lors de la récupération des demandes:', err);
      throw err
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère toutes les demandes de substitution pour une période donnée.
   * @param {Array} dates - Dates de la période à récupérer
   * @returns {Promise<void>}
   */
  const fetchAllDemands = async (dates) => {
    loading.value = true;
    try {
      substitutions.value = await fetchDemands(dates);
    } catch (err) {
      console.error(err.message);
      throw err
    } finally {
      loading.value = false;
    }
  };
  

   /**
   * Crée une nouvelle substitution.
   * @param {Object} substitutionData - Les données de la nouvelle substitution.
   */
   const createSubstitutionDemand = async (substitutionData) => {
    try {
      loading.value = true;
      error.value = null;
      const newSubstitution = await substitutionService.createSubstitutionDemand(substitutionData);
      fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
    } catch (err) {
      error.value = err.message || 'Erreur lors de la création de la substitution';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour une substitution.
   * @param {string} substitutionId - L'ID de la substitution.
   * @param {Object} substitutionData - Les nouvelles données de la substitution.
   */
  const updateSubstitution = async (substitutionId, substitutionData) => {
    try {
      loading.value = true;
      error.value = null;
      const updatedSubstitution = await substitutionService.updateSubstitution(substitutionId, substitutionData);
      const index = substitutions.value.findIndex(s => s._id === substitutionId);
      if (index !== -1) {
        substitutions.value[index] = updatedSubstitution;
      }
      if (currentSubstitution.value?._id === substitutionId) {
        currentSubstitution.value = updatedSubstitution;
      }
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour de la substitution';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Supprime une substitution.
   * @param {string} substitutionId - L'ID de la substitution à supprimer.
   */
  const cancelDemand = async (demandId) => {
    try {
      loading.value = true;
      error.value = null;
      await substitutionService.cancelDemand(demandId);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression de la substitution';
      throw err;
    } finally {
      loading.value = false;
    }
  };


  /**
   * Accepte une demande de substitution.
   * @param {string} demandId - ID de la demande à accepter
   */
  const acceptDemand = async (demandId) => {
    loading.value = true;
    try {
      await substitutionService.acceptDemand(demandId);
      // Rafraîchir les données pour la période actuelle
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
    } catch (err) {
      console.error('Erreur lors de l\'acceptation de la demande:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour le statut d'une demande existante.
   * @param {string} id - ID de la demande.
   * @param {string} status - Nouveau statut.
   */
  const updateDemandStatus = async (id, status) => {
    loading.value = true;
    try {
      const updatedDemand = await substitutionService.updateDemandStatus(id, status);
      const index = substitutions.value.findIndex((d) => d._id === id);
      if (index !== -1) substitutions.value[index].status = updatedDemand.status;
    } catch (err) {
      console.error('Erreur lors de la mise à jour du statut:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  async function checkUserShift(date) {
    try {
      return await substitutionService.checkUserShift(date);
    } catch (error) {
      console.error('Erreur lors de la vérification du shift:', error);
      throw error;
    }
  }

  async function swapShifts(demandId, userShiftId) {
    try {
      await substitutionService.swapShifts(demandId, userShiftId);
            // Rafraîchir les données pour la période actuelle
            await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
    } catch (error) {
      console.error('Erreur lors de l\'échange des shifts:', error);
      throw error;
    }
  }

  async function markInterest(demandId) {
    try {
      const response = await substitutionService.markInterest(demandId);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
      return response;
    } catch (error) {
      console.error('Erreur lors du marquage de l\'intérêt:', error.message);
      throw error;
    }
  }

  return {
    // State
    substitutions,
    currentSubstitution,
    loading,
    error,

    // Computed
    ownAcceptedSubstitutions,
    ownPendingSubstitutions,
    acceptedSubstitutionsToDo,
    availableSubstitutions,
    availableSwitches,
    hasAvailableSubstitutions,
    hasAvailableSwitches,
    hasAcceptedSubstitutionsAsPoster,
    hasAcceptedSubstitutionsAsAccepter,
    hasOwnOpenSubstitutions,
    getAvailableSubstitutionsCount,
    getAvailableSwitchesCount,


    // Actions
    fetchSubstitutionById,
    createSubstitutionDemand,
    updateSubstitution,
    cancelDemand,
    fetchDemands,
    fetchAllDemands,
    updateDemandStatus,
    acceptDemand,
    checkUserShift,
    swapShifts,
    markInterest
  };
});
