import { defineStore } from 'pinia';
import { centerTransferService } from '@/services/centerTransferService.js';

export const useCenterTransferStore = defineStore('centerTransfer', () => {
  // Ma demande en cours (null : aucune) et, pour un administrateur, les demandes de son centre
  const mine = ref(null);
  const transfers = ref([]);
  const loading = ref(false);

  // Demandes que l'administrateur peut accepter : sert de pastille sur l'onglet « Mutations »
  const pendingCount = computed(() => transfers.value.filter((transfer) => transfer.canAccept).length);

  const fetchMine = async () => {
    mine.value = await centerTransferService.getMine();
    return mine.value;
  };

  const preview = () => centerTransferService.preview();

  const request = async ({ toCenterId, reason }) => {
    await centerTransferService.request({ toCenterId, reason });
    await fetchMine();
  };

  const cancel = async () => {
    await centerTransferService.cancel();
    mine.value = null;
  };

  const fetchAll = async () => {
    loading.value = true;
    try {
      transfers.value = await centerTransferService.list();
    } finally {
      loading.value = false;
    }
  };

  const accept = async (userId) => {
    const result = await centerTransferService.accept(userId);
    transfers.value = transfers.value.filter((transfer) => transfer.userId !== userId);
    return result;
  };

  const resetStore = () => {
    mine.value = null;
    transfers.value = [];
  };

  return { mine, transfers, loading, pendingCount, fetchMine, preview, request, cancel, fetchAll, accept, resetStore };
});
