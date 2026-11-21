import { defineStore } from 'pinia';
import { posterDay } from '@/utils/dayFields.js';
import { demandService } from '@/services/demandService';
import { ruleService } from '@/services/ruleService';
import { useAuthStore } from '@/stores/authStore';
import { useShiftStore } from '@/stores/shiftStore';
import { usePointStore } from '@/stores/pointStore';
import { sameDateKey, sameId, toDateKey } from '@/utils/dateKey';

/**
 * Store Pinia pour gérer l'état des demandes (remplacement, permutation ou les deux).
 * Ce store gère toutes les opérations liées aux demands, y compris :
 * - Les demandes de remplacement, de permutation ou mixtes
 * - Les échanges de shifts
 * - Le suivi des statuts
 * - Les filtres et compteurs
 *
 * @module demandStore
 */
export const useDemandStore = defineStore('demand', () => {
  // =============== STATE ===============
  const demands = ref([]);
  const isMailingEnabled = ref(false);

  const loading = ref(false);
  const error = ref(null);
  const startDate = ref(null);
  const endDate = ref(null);

  const shiftStore = useShiftStore();
  const authStore = useAuthStore();
  const userId = computed(() => authStore.userData.userId);
  const pointStore = usePointStore();

  // =============== UTILITY FUNCTIONS ===============

  const matchesDate = (demands, date) => {
    if (!demands?.length || !date) return false;
    return demands.some((demand) => sameDateKey(posterDay(demand), date));
  };

  const isOwn = (demand) => sameId(demand.posterId, userId.value);
  const isOther = (demand) => !sameId(demand.posterId, userId.value);

  // =============== COMPUTED PROPERTIES ===============

  // ----- Pending -----

  const pendingTrueSwitches = computed(() => {
    if (!userId.value) return [];
    return demands.value.filter(
      (demand) => demand.status === 'open' && demand.type === 'switch',
    );
  });

  const pendingTrueSubstitutions = computed(() => {
    if (!userId.value) return [];
    return demands.value.filter(
      (demand) => demand.status === 'open' && demand.type === 'substitution',
    );
  });

  const pendingHybridSubstitutions = computed(() => {
    if (!userId.value) return [];
    return demands.value.filter(
      (demand) => demand.status === 'open' && demand.type === 'hybrid',
    );
  });

  // ----- Own Substitutions -----

  const ownPendingTrueSwitches = computed(() => {
    if (!userId.value) return [];
    return pendingTrueSwitches.value.filter((demand) => isOwn(demand));
  });

  const ownPendingTrueSubstitutions = computed(() => {
    if (!userId.value) return [];
    return pendingTrueSubstitutions.value.filter((demand) => isOwn(demand));
  });

  const ownPendingHybridSubstitutions = computed(() => {
    if (!userId.value) return [];
    return pendingHybridSubstitutions.value.filter((demand) => isOwn(demand));
  });

  // ----- Available -----

  const availableSwitches = computed(() => {
    if (!userId.value) return [];
    return [
      ...pendingHybridSubstitutions.value.filter(
        (demand) => isOther(demand) && demand.canSwitch && demand.limit?.length === 1,
      ),
      ...pendingTrueSwitches.value.filter(
        (demand) => isOther(demand) && demand.canSwitch && demand.limit?.length === 1,
      ),
    ];
  });

  const availableSubstitutions = computed(() => {
    if (!userId.value) return [];
    return [
      ...pendingHybridSubstitutions.value.filter(
        (demand) => isOther(demand) && !demand.canSwitch && demand.limit?.length === 0,
      ),
      ...pendingTrueSubstitutions.value.filter(
        (demand) => isOther(demand) && demand.limit?.length === 0,
      ),
    ];
  });

  const otherDemands = computed(() => {
    if (!userId.value) return [];
    return demands.value.filter(
      (demand) =>
        demand.status === 'open' &&
        isOther(demand) &&
        !availableSwitches.value.includes(demand) &&
        !availableSubstitutions.value.includes(demand),
    );
  });

  /** Demandes potentiellement compatibles : dans otherDemands, sans variante choisie, compatibles avec au moins une variante mais pas toutes */
  const potentiallyCompatibleDemands = computed(() => {
    if (!userId.value) return [];
    return otherDemands.value.filter((d) => d.potentiallyCompatible === true);
  });

  // ----- Accepted as Poster -----

  const acceptedAsPoster = computed(() => {
    if (!userId.value) return [];
    return demands.value.filter((demand) => demand.status === 'accepted' && isOwn(demand));
  });

  // ----- Accepted as Accepter -----

  const acceptedAsAccepter = computed(() => {
    if (!userId.value) return [];
    return demands.value.filter(
      (demand) =>
        demand.status === 'accepted' && sameId(demand.accepterId, userId.value) && isOther(demand),
    );
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

  const hasOwnPendingDemand = computed(() => (date) => {
    if (!userId.value) return false;

    return (
      matchesDate(ownPendingHybridSubstitutions.value, date) ||
      matchesDate(ownPendingTrueSubstitutions.value, date) ||
      matchesDate(ownPendingTrueSwitches.value, date)
    );
  });

  const hasAcceptedAsPoster = computed(() => (date) => {
    if (!userId.value) return false;
    return matchesDate(acceptedAsPoster.value, date);
  });

  // =============== ACTIONS ===============

  // ----- Récupération des données -----

  const checkMailingRule = async () => {
    try {
      const centerId = authStore.userData.centerId;
      if (centerId) {
        const rules = await ruleService.getAllRules(centerId);
        const mailingRule = rules.find((r) => r.name === 'Mailing administration');
        isMailingEnabled.value = mailingRule?.value?.enabled || false;
      }
    } catch (err) {
      console.error('Erreur lors de la vérification de la règle de mailing:', err);
    }
  };

  // Une demande (par exemple celle dont une autre dépend) : celle de la liste déjà chargée, sinon (terminée, hors période...) le serveur
  const fetchDemand = async (demandId) =>
    demands.value.find((demand) => demand._id === demandId) ?? (await demandService.getDemand(demandId));

  const sendAdminMail = async (demandId) => {
    try {
      const response = await demandService.sendAdminMail(demandId);
      const index = demands.value.findIndex((s) => s._id === demandId);
      if (index !== -1) {
        demands.value[index].mailStatus = 'sent';
      }
      return response;
    } catch (err) {
      console.error("Erreur lors de l'envoi du mail administration:", err);
      throw err;
    }
  };

  const fetchDemands = async (dates, status) => {
    try {
      await checkMailingRule();
      const demands = await demandService.fetchAndMarkAsSeen(dates, status);
      startDate.value = dates.startDate;
      endDate.value = dates.endDate;
      return demands;
    } catch (err) {
      error.value = err.message;
      console.error('Erreur lors de la récupération des demandes:', err);
      throw err;
    }
  };

  const fetchAllDemands = async (dates) => {
    loading.value = true;
    try {
      const newDemands = await fetchDemands(dates);

      newDemands.forEach((newDemand) => {
        const existingIndex = demands.value.findIndex((s) => s._id === newDemand._id);

        if (existingIndex !== -1) {
          // Remplacer la demande existante
          demands.value[existingIndex] = newDemand;
        } else {
          // Ajouter la nouvelle demande
          demands.value.push(newDemand);
        }
      });
    } catch (err) {
      console.error(err.message);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ----- Gestion des demandes -----
  const createDemand = async (demandData) => {
    try {
      loading.value = true;
      error.value = null;
      const newDemand = await demandService.createDemand(demandData);
      demands.value.push(newDemand);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la création de la demande';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const cancelDemand = async (demandId) => {
    try {
      loading.value = true;
      error.value = null;
      const response = await demandService.cancelDemand(demandId);
      const index = demands.value.findIndex((s) => s._id === demandId);
      if (index !== -1) {
        demands.value.splice(index, 1);
      }

      shiftStore.addEntry(response.shift);

      await pointStore.fetchTransactions();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression de la demande';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // ----- Gestion des acceptations -----
  const acceptDemand = async (demandId) => {
    loading.value = true;
    try {
      const updatedDemand = await demandService.acceptDemand(demandId);
      const index = demands.value.findIndex((s) => s._id === demandId);
      if (index !== -1) {
        demands.value[index] = updatedDemand.demand;
      }

      shiftStore.addEntry(updatedDemand.newShiftData);
      recategorizeDemands(updatedDemand.newShiftData.date);
      await pointStore.fetchTransactions();
    } catch (err) {
      console.error("Erreur lors de l'acceptation de la demande:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const swapShifts = async (demandId) => {
    try {
      const response = await demandService.swapShifts(demandId);
      const index = demands.value.findIndex((s) => s._id === demandId);
      if (index !== -1) {
        demands.value[index] = response.demand;
      }

      shiftStore.addEntry(response.newShiftData);
      recategorizeDemands(response.newShiftData.date);
      await pointStore.fetchTransactions();
    } catch (error) {
      console.error("Erreur lors de l'échange des shifts:", error);
      throw error;
    }
  };

  const unacceptDemand = async (demandId) => {
    try {
      const updatedDemand = await demandService.unacceptDemand(demandId);
      const index = demands.value.findIndex((s) => s._id === demandId);
      if (index !== -1) {
        demands.value[index] = updatedDemand.demand;
      }

      shiftStore.addEntry(updatedDemand.newShiftData);
      recategorizeDemands(updatedDemand.newShiftData.date);
      await pointStore.fetchTransactions();
    } catch (error) {
      console.error("Erreur lors de l'annulation de l'acceptation:", error.message);
      throw error;
    }
  };

  // ----- Gestion des échanges -----

  const checkUserShift = async (date) => {
    try {
      return await demandService.checkUserShift(date);
    } catch (error) {
      console.error('Erreur lors de la vérification du shift:', error);
      throw error;
    }
  };

  const markInterest = async (demandId) => {
    try {
      const response = await demandService.markInterest(demandId);
      await fetchAllDemands({ startDate: startDate.value, endDate: endDate.value });
      return response;
    } catch (error) {
      console.error("Erreur lors du marquage de l'intérêt:", error.message);
      throw error;
    }
  };

  const consultDemand = async (demandId) => {
    try {
      await demandService.consultDemand(demandId);
      const index = demands.value.findIndex((sub) => sub._id === demandId);
      if (index !== -1) {
        demands.value[index].isNew = false;
      }
    } catch (error) {
      console.error('Erreur lors de la consultation de la demande:', error.message);
      throw error;
    }
  };

  // ----- Get open demand IDs from others within date range -----

  const getOpenDemandIdsFromOthers = (dateKey) => {
    if (!userId.value) return [];

    const targetDate = new Date(dateKey);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 6);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 6);

    return demands.value
      .filter(
        (demand) =>
          demand.status === 'open' &&
          isOther(demand) &&
          posterDay(demand) >= toDateKey(startDate) &&
          posterDay(demand) <= toDateKey(endDate),
      )
      .map((demand) => demand._id);
  };

  const recategorizeDemands = async (dateKey) => {
    try {
      const openDemandIds = getOpenDemandIdsFromOthers(dateKey);
      if (openDemandIds.length > 0) {
        const recategorizedDemands = await demandService.recategorizeDemands(openDemandIds);
        recategorizedDemands.categorizedDemands.forEach((updatedDemand) => {
          const index = demands.value.findIndex((sub) => sub._id === updatedDemand._id);
          if (index !== -1) {
            demands.value[index] = updatedDemand;
          }
        });
      }
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récategorisation des demandes';
      throw err;
    }
  };

  const emptyStore = () => {
    demands.value = [];
    loading.value = false;
    error.value = null;
  };

  /** Charge de demandes par jour (comptes), non conservée dans le store : lecture à la demande. */
  const fetchDemandHeatmap = (centerId, dates) => demandService.fetchDemandHeatmap(centerId, dates);

  return {
    // State
    demands,
    isMailingEnabled,

    loading,
    error,

    // Computed

    ownPendingTrueSwitches,
    ownPendingTrueSubstitutions,
    ownPendingHybridSubstitutions,

    availableSwitches,
    availableSubstitutions,
    otherDemands,
    potentiallyCompatibleDemands,

    hasAvailableSwitches,
    hasAvailableSubstitutions,
    hasOtherDemands,

    hasOwnPendingDemand,

    acceptedAsPoster,
    acceptedAsAccepter,

    hasAcceptedAsPoster,

    // Actions

    fetchAllDemands,
    fetchDemandHeatmap,
    createDemand,
    cancelDemand,
    acceptDemand,
    unacceptDemand,
    checkUserShift,
    swapShifts,
    markInterest,
    consultDemand,
    recategorizeDemands,
    emptyStore,
    sendAdminMail,
    fetchDemand,
  };
});
