import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { planningModificationService } from '@/services/planningModificationService';
import { useAuthStore } from '@/stores/authStore';

/**
 * Store Pinia pour gérer l'état des modifications de planning.
 * Ce store gère toutes les opérations liées aux modifications de planning, y compris :
 * - La création de modifications (absences, jours de congé, etc.)
 * - La récupération des modifications d'un utilisateur
 * - La gestion des statuts (pending, approved, rejected)
 * - Le suivi des modifications par centre (pour les admins)
 * 
 * @module planningModificationStore
 */
export const usePlanningModificationStore = defineStore('planningModification', () => {
  // =============== STATE ===============
  const modifications = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const currentModification = ref(null);

  const authStore = useAuthStore();
  const userId = computed(() => authStore.userData.userId);

  // =============== COMPUTED PROPERTIES ===============
  
  // Modifications en attente d'approbation
  const pendingModifications = computed(() => {
    if (!userId.value) return [];
    return modifications.value.filter(mod => mod.status === 'pending');
  });

  // Modifications approuvées
  const approvedModifications = computed(() => {
    if (!userId.value) return [];
    return modifications.value.filter(mod => mod.status === 'approved');
  });

  // Modifications rejetées
  const rejectedModifications = computed(() => {
    if (!userId.value) return [];
    return modifications.value.filter(mod => mod.status === 'rejected');
  });

  // Absences
  const absences = computed(() => {
    if (!userId.value) return [];
    return modifications.value.filter(mod => mod.type === 'absence');
  });

  // Jours de congé
  const offDays = computed(() => {
    if (!userId.value) return [];
    return modifications.value.filter(mod => mod.type === 'off_day');
  });

  // Modifications personnalisées
  const customModifications = computed(() => {
    if (!userId.value) return [];
    return modifications.value.filter(mod => mod.type === 'custom_modification');
  });

  // =============== ACTIONS ===============

  /**
   * Crée une nouvelle modification de planning
   * @param {Object} modificationData - Données de la modification
   * @returns {Promise<Object>} La modification créée
   */
  const createModification = async (modificationData) => {
    try {
      loading.value = true;
      error.value = null;
      
      const newModification = await planningModificationService.createModification(modificationData);
      modifications.value.push(newModification);
      
      return newModification;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la création de la modification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les modifications d'un utilisateur
   * @param {Object} [params] - Paramètres de filtrage
   * @returns {Promise<Array>} Liste des modifications
   */
  const fetchUserModifications = async (params = {}) => {
    try {
      loading.value = true;
      error.value = null;
      
      const userModifications = await planningModificationService.getUserModifications(params);
      modifications.value = userModifications;
      
      return userModifications;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des modifications';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les modifications d'un centre (pour les admins)
   * @param {string} centerId - ID du centre
   * @param {Object} [params] - Paramètres de filtrage
   * @returns {Promise<Array>} Liste des modifications
   */
  const fetchCenterModifications = async (centerId, params = {}) => {
    try {
      loading.value = true;
      error.value = null;
      
      const centerModifications = await planningModificationService.getCenterModifications(centerId, params);
      modifications.value = centerModifications;
      
      return centerModifications;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des modifications du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour une modification
   * @param {string} id - ID de la modification
   * @param {Object} modificationData - Nouvelles données
   * @returns {Promise<Object>} La modification mise à jour
   */
  const updateModification = async (id, modificationData) => {
    try {
      loading.value = true;
      error.value = null;
      
      const updatedModification = await planningModificationService.updateModification(id, modificationData);
      
      // Mettre à jour la modification dans le store
      const index = modifications.value.findIndex(mod => mod._id === id);
      if (index !== -1) {
        modifications.value[index] = updatedModification;
      }
      
      return updatedModification;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour de la modification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Supprime une modification
   * @param {string} id - ID de la modification à supprimer
   * @returns {Promise<void>}
   */
  const deleteModification = async (id) => {
    try {
      loading.value = true;
      error.value = null;
      
      await planningModificationService.deleteModification(id);
      
      // Supprimer la modification du store
      modifications.value = modifications.value.filter(mod => mod._id !== id);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression de la modification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour le statut d'une modification (pour les admins)
   * @param {string} id - ID de la modification
   * @param {string} status - Nouveau statut
   * @param {string} [comment] - Commentaire optionnel
   * @returns {Promise<Object>} La modification mise à jour
   */
  const updateModificationStatus = async (id, status, comment = '') => {
    try {
      loading.value = true;
      error.value = null;
      
      const updatedModification = await planningModificationService.updateModificationStatus(id, status, comment);
      
      // Mettre à jour la modification dans le store
      const index = modifications.value.findIndex(mod => mod._id === id);
      if (index !== -1) {
        modifications.value[index] = updatedModification;
      }
      
      return updatedModification;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour du statut';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère une modification spécifique
   * @param {string} id - ID de la modification
   * @returns {Promise<Object>} La modification
   */
  const fetchModification = async (id) => {
    try {
      loading.value = true;
      error.value = null;
      
      const modification = await planningModificationService.getModification(id);
      currentModification.value = modification;
      
      return modification;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération de la modification';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Vérifie les conflits avec les substitutions pour une date donnée
   * @param {string} date - Date à vérifier
   * @returns {Promise<boolean>} true s'il y a des conflits
   */
  const checkSubstitutionConflicts = async (date) => {
    try {
      return await planningModificationService.checkSubstitutionConflicts(date);
    } catch (err) {
      console.error('Erreur lors de la vérification des conflits:', err);
      return false;
    }
  };

  /**
   * Nettoie le store
   */
  const clearStore = () => {
    modifications.value = [];
    currentModification.value = null;
    loading.value = false;
    error.value = null;
  };

  return {
    // State
    modifications,
    loading,
    error,
    currentModification,
    
    // Computed
    pendingModifications,
    approvedModifications,
    rejectedModifications,
    absences,
    offDays,
    customModifications,
    
    // Actions
    createModification,
    fetchUserModifications,
    fetchCenterModifications,
    updateModification,
    deleteModification,
    updateModificationStatus,
    fetchModification,
    checkSubstitutionConflicts,
    clearStore
  };
});
