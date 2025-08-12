import { defineStore } from 'pinia';
import { ref } from 'vue';
import { statService } from '@/services/statService';

/**
 * Store Pinia pour gérer les statistiques de l'application.
 * @module statStore
 */
export const useStatStore = defineStore('stat', () => {
  // State
  const totalUsers = ref(0);
  const totalCenters = ref(0);
  const totalSubstitutions = ref(0);
  const isLoading = ref(false);
  const error = ref(null);

  // Getters
  const hasStats = () => {
    return totalUsers.value > 0 || totalCenters.value > 0 || totalSubstitutions.value > 0;
  };

  const getStatsSummary = () => {
    return {
      totalUsers: totalUsers.value,
      totalCenters: totalCenters.value,
      totalSubstitutions: totalSubstitutions.value
    };
  };

  // Actions
  /**
   * Récupère toutes les statistiques depuis l'API.
   */
  const fetchStats = async () => {
    try {
      isLoading.value = true;
      error.value = null;
      
      const stats = await statService.getStats();
      
      totalUsers.value = stats.data.totalUsers;
      totalCenters.value = stats.data.totalCenters;
      totalSubstitutions.value = stats.data.totalSubstitutions;
      
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des statistiques';
      console.error('Erreur lors de la récupération des statistiques:', err);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Réinitialise le store.
   */
  const resetStats = () => {
    totalUsers.value = 0;
    totalCenters.value = 0;
    totalSubstitutions.value = 0;
    error.value = null;
  };

  return {
    // State
    totalUsers,
    totalCenters,
    totalSubstitutions,
    isLoading,
    error,
    
    // Getters
    hasStats,
    getStatsSummary,
    
    // Actions
    fetchStats,
    resetStats
  };
});
    