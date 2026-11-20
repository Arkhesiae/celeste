import { defineStore } from 'pinia';
import { bannerService } from '@/services/bannerService.js';
import { useSnackbarStore } from './snackbarStore';

export const useBannerStore = defineStore('banner', () => {
  const snackbarStore = useSnackbarStore();

  // ── State ────────────────────────────────────────────────────────────────

  const permanentBanners = ref([]);

  const nonPermanentBanners = ref([]);
  const allBanners = ref([]);

  const loading = ref(false);
  const saving = ref(false);

  const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });

  // ── Getters ──────────────────────────────────────────────────────────────

  const currentBanner = computed(() => {
    return nonPermanentBanners.value[0] ?? null;
  });

  const hasBanners = computed(() => {
    return permanentBanners.value.length > 0 || nonPermanentBanners.value.length > 0;
  });
  const pendingCount = computed(() => nonPermanentBanners.value.length);

  // ── Actions ──────────────────────────────────────────────────────────────

  const fetchActive = async () => {
    try {
      loading.value = true;
      const data = await bannerService.getActive();
      permanentBanners.value = data.permanentBanners ?? [];
      nonPermanentBanners.value = data.nonPermanentBanners ?? [];
    } catch (error) {
      console.error('[Banner] Erreur lors du chargement des bannières :', error);
    } finally {
      loading.value = false;
    }
  };

  const acknowledge = async (id) => {
    try {
      await bannerService.acknowledge(id);
      nonPermanentBanners.value = nonPermanentBanners.value.filter((a) => a._id !== id);
    } catch (error) {
      console.error("[Banner] Erreur lors de l'acquittement:", error);
    }
  };

  // ── Admin actions ────────────────────────────────────────────────────────

  const fetchAll = async (params = {}) => {
    try {
      loading.value = true;
      const data = await bannerService.getAll(params);
      allBanners.value = data.banners ?? [];
      pagination.value = data.pagination ?? pagination.value;
    } catch (error) {
      console.error('[Banner] Erreur admin fetch:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const create = async (formData) => {
    try {
      saving.value = true;
      const data = await bannerService.create(formData);
      allBanners.value.unshift(data.banner);
      snackbarStore.showNotification('Bannière créée avec succès', 'success', 'mdi-bullhorn');
      return data.banner;
    } catch (error) {
      snackbarStore.showNotification('Erreur lors de la création : ' + error.message, 'error', 'mdi-alert-circle');
      throw error;
    } finally {
      saving.value = false;
    }
  };

  const update = async (id, formData) => {
    try {
      saving.value = true;
      const data = await bannerService.update(id, formData);
      const idx = allBanners.value.findIndex((a) => a._id === id);
      if (idx !== -1) allBanners.value[idx] = data.banner;
      snackbarStore.showNotification('Bannière mise à jour', 'success', 'mdi-check-circle');
      return data.banner;
    } catch (error) {
      snackbarStore.showNotification('Erreur lors de la mise à jour : ' + error.message, 'error', 'mdi-alert-circle');
      throw error;
    } finally {
      saving.value = false;
    }
  };

  const remove = async (id) => {
    try {
      saving.value = true;
      await bannerService.remove(id);
      allBanners.value = allBanners.value.filter((a) => a._id !== id);
      snackbarStore.showNotification('Bannière supprimée', 'success', 'mdi-trash-can');
    } catch (error) {
      snackbarStore.showNotification('Erreur lors de la suppression : ' + error.message, 'error', 'mdi-alert-circle');
      throw error;
    } finally {
      saving.value = false;
    }
  };

  const resetStore = () => {
    permanentBanners.value = [];
    nonPermanentBanners.value = [];
    allBanners.value = [];
  };

  return {
    // State
    permanentBanners,
    nonPermanentBanners,
    allBanners,
    loading,
    saving,
    pagination,
    // Getters
    currentBanner,
    hasBanners,
    pendingCount,
    // User actions
    fetchActive,
    acknowledge,
    // Admin actions
    fetchAll,
    create,
    update,
    remove,
    resetStore,
  };
});
