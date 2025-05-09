import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { getTransactionHistory, getUserPoints, getPendingTransactions } from '@/services/pointService';
import { useAuthStore } from './authStore';

/**
 * Store Pinia pour gérer l'état des points.
 * @module pointStore
 */
export const usePointStore = defineStore('points', () => {
  const authStore = useAuthStore();

  // State
  const points = ref();
  const transactions = ref([]);
  const pendingTransactions = ref([]);
  const isLoading = ref(false);
  const isLoadingPending = ref(false);

  /**
   * Formate une date au format français.
   * @param {string} dateString - La date à formater.
   * @returns {string} La date formatée.
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /**
   * Récupère les points de l'utilisateur.
   */
  const fetchUserPoints = async () => {
    try {
      isLoading.value = true;
      const data = await getUserPoints(authStore.userId);
      points.value = data.points;
    } catch (error) {
      console.error('Erreur lors de la récupération des points:', error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Récupère l'historique des transactions.
   */
  const fetchTransactions = async () => {
    try {
      isLoading.value = true;
      const data = await getTransactionHistory(authStore.userId);
      transactions.value = data.map(t => ({
        type: t.sender._id === authStore.userId ? 'sent' : 'received',
        amount: t.amount,
        description: t.description || (t.type === 'transfer' ? 'Transfert de points' : 'Remplacement'),
        date: formatDate(t.createdAt),
        user: t.sender._id === authStore.userId ? t.receiver.name : t.sender.name
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Récupère les transactions en attente.
   */
  const fetchPendingTransactions = async () => {
    try {
      isLoadingPending.value = true;
      const data = await getPendingTransactions(authStore.userId);
      pendingTransactions.value = data.map(t => ({
        amount: t.amount,
        description: t.description || 'Transaction en attente',
        date: formatDate(t.createdAt),
        user: t.sender._id === authStore.userId ? t.receiver.name : t.sender.name
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions en attente:', error);
    } finally {
      isLoadingPending.value = false;
    }
  };

  const formattedPoints = computed(() => formatPoints(points.value));

  return {
    // State
    points,
    transactions,
    pendingTransactions,
    isLoading,
    isLoadingPending,

    // Actions
    fetchUserPoints,
    fetchTransactions,
    fetchPendingTransactions,
  };
}); 