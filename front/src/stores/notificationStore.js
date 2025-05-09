import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { notificationService } from '@/services/notificationService';

/**
 * Store Pinia pour gérer l'état des notifications.
 * @module notificationStore
 */
export const useNotificationStore = defineStore('notification', () => {
  // State
  const notifications = ref([]);
  const currentNotification = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // Getters
  const getNotifications = computed(() => notifications.value);
  const getCurrentNotification = computed(() => currentNotification.value);
  const isLoading = computed(() => loading.value);
  const getError = computed(() => error.value);

  // Actions
  /**
   * Récupère toutes les notifications.
   */
  const fetchNotifications = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      notifications.value = await notificationService.getNotifications(userId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des notifications';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère une notification par son ID.
   * @param {string} notificationId - L'ID de la notification.
   */
  const fetchNotificationById = async (notificationId) => {
    try {
      loading.value = true;
      error.value = null;
      currentNotification.value = await notificationService.getNotificationById(notificationId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération de la notification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Crée une nouvelle notification.
   * @param {Object} notificationData - Les données de la nouvelle notification.
   */
  const createNotification = async (notificationData) => {
    try {
      loading.value = true;
      error.value = null;
      const newNotification = await notificationService.createNotification(notificationData);
      notifications.value.push(newNotification);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la création de la notification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour une notification.
   * @param {string} notificationId - L'ID de la notification.
   * @param {Object} notificationData - Les nouvelles données de la notification.
   */
  const updateNotification = async (notificationId, notificationData) => {
    try {
      loading.value = true;
      error.value = null;
      const updatedNotification = await notificationService.updateNotification(notificationId, notificationData);
      const index = notifications.value.findIndex(n => n._id === notificationId);
      if (index !== -1) {
        notifications.value[index] = updatedNotification;
      }
      if (currentNotification.value?._id === notificationId) {
        currentNotification.value = updatedNotification;
      }
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour de la notification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Supprime une notification.
   * @param {string} notificationId - L'ID de la notification à supprimer.
   */
  const deleteNotification = async (notificationId) => {
    try {
      loading.value = true;
      error.value = null;
      await notificationService.deleteNotification(notificationId);
      notifications.value = notifications.value.filter(n => n._id !== notificationId);
      if (currentNotification.value?._id === notificationId) {
        currentNotification.value = null;
      }
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression de la notification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    notifications,
    currentNotification,
    loading,
    error,
    // Getters
    getNotifications,
    getCurrentNotification,
    isLoading,
    getError,
    // Actions
    fetchNotifications,
    fetchNotificationById,
    createNotification,
    updateNotification,
    deleteNotification
  };
}); 