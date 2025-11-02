import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSnackbarStore } from './snackbarStore';
import { emailService } from '@/services/emailService.js';

export const useEmailStore = defineStore('email', () => {
  const snackbarStore = useSnackbarStore();

  // États
  const userCount = ref(0);
  const emailHistory = ref([]);
  const loading = ref(false);     
  const sending = ref(false);

  // Statistiques
  const lastSentCount = ref(0);
  const lastFailedCount = ref(0);

  // Getters


  const totalEmailsSent = computed(() => {
    return emailHistory.value.reduce((total, item) => total + (item.results?.sent || 0), 0);
  });

  const totalEmailsFailed = computed(() => {
    return emailHistory.value.reduce((total, item) => total + (item.results?.failed || 0), 0);
  });

  // Méthodes utilitaires 




  const fetchUserCount = async () => {
    try {
      const data = await emailService.getUserCount();
      userCount.value = data.count || data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const sendAnnouncement = async (announcementData) => {
    try {
      sending.value = true;
      
      const data = await emailService.sendAnnouncement(announcementData);

      // Mettre à jour les statistiques
      if (data.results) {
        lastSentCount.value = data.results.sent;
        lastFailedCount.value = data.results.failed;
      }

      // Ajouter à l'historique
      emailHistory.value.unshift({
        templateType: announcementData.templateType,
        message: announcementData.message,
        sentAt: new Date(),
        results: data.results,
        testMode: announcementData.testMode
      });

      // Notification de succès
      const message = announcementData.testMode 
        ? 'Email de test envoyé avec succès'
        : `Annonce envoyée à ${data.results.sent} utilisateurs`;
      
      snackbarStore.showNotification(message, 'success', 'mdi-email-check');

      return data;
    } catch (error) {
      throw error;
    } finally {
      sending.value = false;
    }
  };

  const fetchEmailHistory = async () => {
    try {
      loading.value = true;
      const data = await emailService.getHistory();
      emailHistory.value = data.history || data;
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const initializeStore = async () => {
    try {
      await Promise.all([
        fetchUserCount(),
        fetchEmailHistory()
      ]);
    } catch (error) {
      console.error(error);
    }
  };

  const resetStore = () => {
    userCount.value = 0;
    emailHistory.value = [];
    lastSentCount.value = 0;
    lastFailedCount.value = 0;
    loading.value = false;
    sending.value = false;
  };

  return {
    // États
    userCount,
    emailHistory,
    loading,
    sending,
    lastSentCount,
    lastFailedCount,

    // Getters
    totalEmailsSent,
    totalEmailsFailed,

    // Méthodes utilitaires

    // Actions
    fetchUserCount, 
    sendAnnouncement,
    fetchEmailHistory,
    initializeStore,
    resetStore
  };
}); 