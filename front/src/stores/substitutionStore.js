import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { substitutionService } from '@/services/substitutionService';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { usePointStore } from '@/stores/pointStore';

/**
 * Store Pinia pour gérer l'état des substitutions.
 * Ce store gère toutes les opérations liées aux substitutions, y compris :
 * - Les demandes de substitution
 * - Les échanges de shifts
 * - Le suivi des statuts
 * - Les filtres et compteurs
 * 
 * @module substitutionStore
 */
export const useSubstitutionStore = defineStore('substitution', () => {
  // =============== STATE ===============
  const substitutions = ref([]);
  const currentSubstitution = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const startDate = ref(null);
  const endDate = ref(null);

  const shiftStore = useShiftStore();
  const authStore = useAuthStore();
  const userId = computed(() => authStore.userId);
  const pointStore = usePointStore();
  // =============== UTILITY FUNCTIONS ===============

  const matchesDate = (substitutions, date) => {
    if (!substitutions?.length) return false;
    return substitutions.some(substitution => 
      substitution.posterShift.date === date
    );
  };

  // =============== COMPUTED PROPERTIES ===============

  // ----- Pending -----

  const pendingTrueSwitches = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' && 
      substitution.type === 'switch'
    );
  });

  const pendingTrueSubstitutions = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' && 
      substitution.type === 'substitution'
    );
  });

  const pendingHybridSubstitutions = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' && 
      substitution.type === 'hybrid'
    );
  });

  // ----- Own Substitutions -----

  const ownPendingTrueSwitches = computed(() => {
    if (!userId.value) return [];
    return pendingTrueSwitches.value.filter(substitution => 
      substitution.posterId === userId.value
    );
  });

  const ownPendingTrueSubstitutions = computed(() => {
    if (!userId.value) return [];
    return pendingTrueSubstitutions.value.filter(substitution => 
      substitution.posterId === userId.value
    );
  });

  const ownPendingHybridSubstitutions = computed(() => {
    if (!userId.value) return [];
    return pendingHybridSubstitutions.value.filter(substitution => 
      substitution.posterId === userId.value
    );
  });

  const findOwnPendingDemand = computed(() => (date) => {
    if (!userId.value) return [];
    const ownPendingDemands = [
      ...ownPendingHybridSubstitutions.value,
      ...ownPendingTrueSubstitutions.value,
      ...ownPendingTrueSwitches.value
    ];

      const ownPendingDemand = ownPendingDemands.find(substitution => substitution.posterShift.date === date);
      if (ownPendingDemand?.length > 1) {
        console.error('Plusieurs demandes en attente pour un même jour');
        throw new Error('Plusieurs demandes en attente pour un même jour');
      };
      return ownPendingDemand;
  });

  // ----- Available -----

  const availableTrueSwitches = computed(() => {
    if (!userId.value) return [];
    return pendingTrueSwitches.value.filter(substitution => 
      substitution.posterId !== userId.value &&
      substitution.canSwitch
    );
  });

  const availableHybridSubstitutions = computed(() => {
    if (!userId.value) return [];
    return pendingHybridSubstitutions.value.filter(substitution => 
      substitution.posterId !== userId.value &&
      substitution.canSwitch
    );
  });

  const availableTrueSubstitutions = computed(() => {
    if (!userId.value) return [];
    return pendingTrueSubstitutions.value.filter(substitution => 
      substitution.posterId !== userId.value &&
      substitution.limit.length === 0
    );
  });

  const availableSwitches = computed(() => {
    if (!userId.value) return [];
    return [
      ...pendingHybridSubstitutions.value.filter(substitution => 
        substitution.posterId !== userId.value &&
        substitution.canSwitch 
      ),
      ...pendingTrueSwitches.value.filter(substitution => 
        substitution.posterId !== userId.value &&
        substitution.canSwitch 
      )
    ];
  });

  const availableSubstitutions = computed(() => {
    if (!userId.value) return [];
    return [
      ...pendingHybridSubstitutions.value.filter(substitution => 
        substitution.posterId !== userId.value &&
        !substitution.canSwitch && 
        substitution.limit.length === 0
      ),
      ...pendingTrueSubstitutions.value.filter(substitution => 
        substitution.posterId !== userId.value &&
        substitution.limit.length === 0
      )
    ];
  });

  const otherDemands = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' &&
      substitution.posterId !== userId.value &&
      !availableSwitches.value.includes(substitution) &&
      !availableSubstitutions.value.includes(substitution)
    );
  });
  

  // ----- Accepted as Poster -----

  const acceptedAsPoster = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'accepted' && 
      substitution.posterId === userId.value
    );
  });

  const findAcceptedAsPoster = computed(() => (date) => {
    if (!userId.value) return [];
    const acceptedAsPosterDemands = [
      ...acceptedAsPoster.value,
    ];

      const acceptedAsPosterDemand = acceptedAsPosterDemands.find(substitution => substitution.posterShift.date === date);
      if (acceptedAsPosterDemand?.length > 1) {
        console.error('Plusieurs demandes acceptées pour un même jour');
        throw new Error('Plusieurs demandes acceptées pour un même jour');
      };
      return acceptedAsPosterDemand;
  });
  

  // ----- Accepted as Accepter -----

  const acceptedAsAccepter = computed(() => {
    if (!userId.value) return [];
    return substitutions.value.filter(substitution => 
      substitution.status === 'accepted' && 
      substitution.accepterId === userId.value &&
      substitution.posterId !== userId.value
    );
  });

  const findAcceptedAsAccepter = computed(() => (date) => {
    if (!userId.value) return [];
    const acceptedAsAccepterDemand = acceptedAsAccepter.value.find(substitution => substitution.posterShift.date === date);
    if (acceptedAsAccepterDemand?.length > 1) {

      console.error('Plusieurs demandes acceptées pour un même jour');
      throw new Error('Plusieurs demandes acceptées pour un même jour');
    };
    return acceptedAsAccepterDemand;
  });



  // ----- Vérifications de disponibilité -----

  const hasAvailableSwitches = computed(() => {
    if (!userId.value) return false;
    return (date) => matchesDate(availableSwitches.value, date);
  });

  const hasAvailableSubstitutions = computed(() => {
    if (!userId.value) return false;
    return (date) => matchesDate(availableSubstitutions.value, date);
  });

  const hasOtherDemands = computed(() => {
    if (!userId.value) return false;
    return (date) => matchesDate(otherDemands.value, date);
  });

  const hasOwnPendingTrueSwitches = computed(() => {
    if (!userId.value) return false;
    return (date) => matchesDate(ownPendingTrueSwitches.value, date);
  });

  const hasOwnPendingTrueSubstitutions = computed(() => {
    if (!userId.value) return false;
    return (date) => matchesDate(ownPendingTrueSubstitutions.value, date);
  });

  const hasOwnPendingHybridSubstitutions = computed(() => {
    if (!userId.value) return false;
    return (date) => matchesDate(ownPendingHybridSubstitutions.value, date);
  });

  const hasOwnPendingDemand = computed(() => (date) => {
    if (!userId.value) return false;
    
    return matchesDate(ownPendingHybridSubstitutions.value, date) ||
           matchesDate(ownPendingTrueSubstitutions.value, date) ||
           matchesDate(ownPendingTrueSwitches.value, date);
  });

  const hasAcceptedAsAccepter = computed(() => (date) => {
    if (!userId.value) return false;
    return matchesDate(acceptedAsAccepter.value, date);
  });

  const hasAcceptedAsPoster = computed(() => (date) => {
    if (!userId.value) return false;
    return matchesDate(acceptedAsPoster.value, date);
  });

  // ----- Compteurs -----

  const countOtherDemands = computed(() => (date) => {
    if (!userId.value) return 0;
    return otherDemands.value.filter(substitution => substitution.posterShift.date === date).length;
  });

  const countAvailableSwitches = computed(() => (date) => {
    if (!userId.value) return 0;
    return availableSwitches.value.filter(substitution => substitution.posterShift.date === date).length;
  });
  
  const countAvailableSubstitutions = computed(() => (date) => {
    if (!userId.value) return 0;
    return availableSubstitutions.value.filter(substitution => substitution.posterShift.date === date).length;
  });

  // =============== ACTIONS ===============

  // ----- Récupération des données -----
  const getAllSubstitutions = async (dates) => {
    return substitutions.value.filter(substitution => 
      substitution.status === 'open' || substitution.status === 'accepted'
    );
  };

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
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAllDemands = async (dates) => {
    loading.value = true;
    try {
      substitutions.value = await fetchDemands(dates);
    } catch (err) {
      console.error(err.message);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ----- Gestion des demandes -----
  const createSubstitutionDemand = async (substitutionData) => {
    try {
      loading.value = true;
      error.value = null;
      await substitutionService.createSubstitutionDemand(substitutionData);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
    } catch (err) {
      error.value = err.message || 'Erreur lors de la création de la substitution';
      throw err;
    } finally {
      loading.value = false;
    }
  };

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

  const cancelDemand = async (demandId) => {
    try {
      loading.value = true;
      error.value = null;
      await substitutionService.cancelDemand(demandId);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
      await shiftStore.fetchShiftsWithSubstitutions();
      await pointStore.fetchTransactions();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression de la substitution';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ----- Gestion des acceptations -----
  const acceptDemand = async (demandId) => {
    loading.value = true;
    try {
      await substitutionService.acceptDemand(demandId);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
      await shiftStore.fetchShiftsWithSubstitutions();
      await pointStore.fetchTransactions();
    } catch (err) {
      console.error('Erreur lors de l\'acceptation de la demande:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const unacceptDemand = async (demandId) => {
    try {
      await substitutionService.unacceptDemand(demandId);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
      await shiftStore.fetchShiftsWithSubstitutions();
      await pointStore.fetchTransactions();
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'acceptation:', error.message);
      throw error;
    }
  };

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

  // ----- Gestion des échanges -----
  const checkUserShift = async (date) => {
    try {
      return await substitutionService.checkUserShift(date);
    } catch (error) {
      console.error('Erreur lors de la vérification du shift:', error);
      throw error;
    }
  };

  const swapShifts = async (demandId) => {
    try {
      await substitutionService.swapShifts(demandId);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
      await shiftStore.fetchShiftsWithSubstitutions();
      await pointStore.fetchTransactions();
      
    } catch (error) {
      console.error('Erreur lors de l\'échange des shifts:', error);
      throw error;
    }
  };

  const markInterest = async (demandId) => {
    try {
      const response = await substitutionService.markInterest(demandId);
      await fetchAllDemands({startDate: startDate.value, endDate: endDate.value});
      return response;
    } catch (error) {
      console.error('Erreur lors du marquage de l\'intérêt:', error.message);
      throw error;
    }
  };

  const fetchSubstitutions = async (date) => {
    try {
      loading.value = true;
      substitutions.value = await substitutionService.getSubstitutions(date);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des substitutions';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    substitutions,
    currentSubstitution,
    loading,
    error,

    // Computed

    ownPendingTrueSwitches,
    ownPendingTrueSubstitutions,
    ownPendingHybridSubstitutions,
    findOwnPendingDemand,

    availableSwitches,
    availableSubstitutions,
    availableTrueSwitches,
    availableTrueSubstitutions,
    otherDemands,

    hasAvailableSwitches,
    hasAvailableSubstitutions,
    hasOtherDemands,


    hasOwnPendingDemand,
    hasOwnPendingTrueSwitches,
    hasOwnPendingTrueSubstitutions,
    hasOwnPendingHybridSubstitutions,

    acceptedAsPoster,
    acceptedAsAccepter,
    hasAcceptedAsAccepter,
    findAcceptedAsAccepter,

    hasAcceptedAsPoster,
    findAcceptedAsPoster,

    countOtherDemands,
    countAvailableSwitches,
    countAvailableSubstitutions,

    // Actions
    getAllSubstitutions,
    fetchSubstitutionById,
    fetchDemands,
    fetchAllDemands,
    createSubstitutionDemand,
    updateSubstitution,
    cancelDemand,
    acceptDemand,
    unacceptDemand,
    updateDemandStatus,
    checkUserShift,
    swapShifts,
    markInterest,
    fetchSubstitutions
  };
});
