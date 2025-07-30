import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSnackbarStore } from './snackbarStore';
import { emailService } from '@/services/emailService.js';

export const useEmailStore = defineStore('email', () => {
  const snackbarStore = useSnackbarStore();

  // États
  const userCount = ref(0);
  const availableTemplates = ref([]);
  const emailHistory = ref([]);
  const loading = ref(false);     
  const sending = ref(false);

  // Statistiques
  const lastSentCount = ref(0);
  const lastFailedCount = ref(0);

  // Getters
  const templatesWithLabels = computed(() => {
    return availableTemplates.value.map(template => ({
      ...template,
      color: getTemplateColor(template.value),
      icon: getTemplateIcon(template.value)
    }));
  });

  const totalEmailsSent = computed(() => {
    return emailHistory.value.reduce((total, item) => total + (item.results?.sent || 0), 0);
  });

  const totalEmailsFailed = computed(() => {
    return emailHistory.value.reduce((total, item) => total + (item.results?.failed || 0), 0);
  });

  // Méthodes utilitaires
  const getTemplateColor = (templateType) => {
    const colors = {
      maintenance: 'warning',
      update: 'success',
      general: 'primary'
    };
    return colors[templateType] || 'primary';
  };

  const getTemplateIcon = (templateType) => {
    const icons = {
      maintenance: 'mdi-wrench',
      update: 'mdi-rocket-launch',
      general: 'mdi-bullhorn'
    };
    return icons[templateType] || 'mdi-email';
  };

  const getTemplateLabel = (templateType) => {
    const labels = {
      maintenance: 'Maintenance',
      update: 'Mise à jour',
      general: 'Annonce générale'
    };
    return labels[templateType] || templateType;
  };

  // Actions API
  const fetchTemplates = async () => {
    try {
      loading.value = true;
      const data = await emailService.getTemplates();
 
      availableTemplates.value = data.templates || data;
      console.log(availableTemplates.value);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const fetchUserCount = async () => {
    try {
      const data = await emailService.getUserCount();
      userCount.value = data.count || data;
    } catch (error) {
      console.error('Erreur lors du chargement du nombre d\'utilisateurs:', error);
      snackbarStore.showNotification(
        'Erreur lors du chargement du nombre d\'utilisateurs', 
        'error', 
        'mdi-alert-circle'
      );
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
      console.error('Erreur lors de l\'envoi de l\'annonce:', error);
      snackbarStore.showNotification(
        'Erreur lors de l\'envoi de l\'annonce', 
        'error', 
        'mdi-alert-circle'
      );
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
      snackbarStore.showNotification(
        'Erreur lors du chargement de l\'historique', 
        'error', 
        'mdi-alert-circle'
      );
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const initializeStore = async () => {
    try {
      await Promise.all([
        fetchTemplates(),
        fetchUserCount(),
        fetchEmailHistory()
      ]);
      snackbarStore.showNotification(
        'Store email initialisé avec succès', 
        'remplacement', 
        'mdi-check'
      );
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du store email:', error);
    }
  };

  const resetStore = () => {
    userCount.value = 0;
    availableTemplates.value = [];
    emailHistory.value = [];
    lastSentCount.value = 0;
    lastFailedCount.value = 0;
    loading.value = false;
    sending.value = false;
  };

  return {
    // États
    userCount,
    availableTemplates,
    emailHistory,
    loading,
    sending,
    lastSentCount,
    lastFailedCount,

    // Getters
    templatesWithLabels,
    totalEmailsSent,
    totalEmailsFailed,

    // Méthodes utilitaires
    getTemplateColor,
    getTemplateIcon,
    getTemplateLabel,

    // Actions
    fetchTemplates,
    fetchUserCount,
    sendAnnouncement,
    fetchEmailHistory,
    initializeStore,
    resetStore
  };
}); 