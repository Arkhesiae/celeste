import { defineStore } from 'pinia';
import { publicAnnouncementService } from '@/services/publicAnnouncementService.js';
import { useSnackbarStore } from './snackbarStore';

export const usePublicAnnouncementStore = defineStore('publicAnnouncement', () => {
  const snackbarStore = useSnackbarStore();

  // ── State ────────────────────────────────────────────────────────────────

  const permanentAnnouncements = ref([]);

  const nonPermanentAnnouncements = ref([]);
  const allAnnouncements = ref([]);

  const loading = ref(false);
  const saving = ref(false);

  const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });

  // ── Getters ──────────────────────────────────────────────────────────────

  const currentBanner = computed(() => {
    return nonPermanentAnnouncements.value[0] ?? null;
  });

  const hasBanners = computed(() => {
    return permanentAnnouncements.value.length > 0 || nonPermanentAnnouncements.value.length > 0;
  });
  const pendingCount = computed(() => nonPermanentAnnouncements.value.length);

  // ── Actions ──────────────────────────────────────────────────────────────

  const fetchActive = async () => {
    try {
      loading.value = true;
      const data = await publicAnnouncementService.getActive();
      permanentAnnouncements.value = data.permanentAnnouncements ?? [];
      nonPermanentAnnouncements.value = data.nonPermanentAnnouncements ?? [];
    } catch (error) {
      console.error('[PublicAnnouncement] Erreur lors du chargement des annonces:', error);
    } finally {
      loading.value = false;
    }
  };

  const acknowledge = async (id) => {
    try {
      await publicAnnouncementService.acknowledge(id);
      // Remove from local list immediately for instant UX
      nonPermanentAnnouncements.value = nonPermanentAnnouncements.value.filter(a => a._id !== id);
    } catch (error) {
      console.error('[PublicAnnouncement] Erreur lors de l\'acquittement:', error);
    }
  };

  // ── Admin actions ────────────────────────────────────────────────────────


  const fetchAll = async (params = {}) => {
    try {
      loading.value = true;
      const data = await publicAnnouncementService.getAll(params);
      allAnnouncements.value = data.announcements ?? [];
      pagination.value = data.pagination ?? pagination.value;
    } catch (error) {
      console.error('[PublicAnnouncement] Erreur admin fetch:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const create = async (formData) => {
    try {
      saving.value = true;
      const data = await publicAnnouncementService.create(formData);
      allAnnouncements.value.unshift(data.announcement);
      snackbarStore.showNotification('Annonce créée avec succès', 'success', 'mdi-bullhorn');
      return data.announcement;
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
      const data = await publicAnnouncementService.update(id, formData);
      const idx = allAnnouncements.value.findIndex(a => a._id === id);
      if (idx !== -1) allAnnouncements.value[idx] = data.announcement;
      snackbarStore.showNotification('Annonce mise à jour', 'success', 'mdi-check-circle');
      return data.announcement;
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
      await publicAnnouncementService.remove(id);
      allAnnouncements.value = allAnnouncements.value.filter(a => a._id !== id);
      snackbarStore.showNotification('Annonce supprimée', 'success', 'mdi-trash-can');
    } catch (error) {
      snackbarStore.showNotification('Erreur lors de la suppression : ' + error.message, 'error', 'mdi-alert-circle');
      throw error;
    } finally {
      saving.value = false;
    }
  };

  const resetStore = () => {
    permanentAnnouncements.value = [];
    nonPermanentAnnouncements.value = [];
    allAnnouncements.value = [];
  };

  return {
    // State
    permanentAnnouncements,
    nonPermanentAnnouncements,
    allAnnouncements,
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
    resetStore
  };
});
