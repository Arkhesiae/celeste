import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { centerService } from '@/services/centerService';

/**
 * Store Pinia pour gérer l'état des centres.
 * @module centerStore
 */
export const useCenterStore = defineStore('center', () => {
  // State
  const centers = ref([]);
  const currentCenter = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const usersByCenter = ref({});
  const usersCountByCenter = ref({});
  const adminsByCenter = ref({});
  const activeRotationsByCenter = ref({});


  // Actions
  /**
   * Récupère tous les centres.
   */
  const fetchCenters = async () => {
    try {
      loading.value = true;
      error.value = null;
      centers.value = await centerService.fetchCenters();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des centres';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les utilisateurs d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   */
  const fetchUsersByCenter = async (centerId) => {
    try {
      loading.value = true;
      error.value = null;
      const users = await centerService.fetchUsersByCenter(centerId);
      usersByCenter.value[centerId] = users;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des utilisateurs du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère le centre d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @returns {Promise<Object|null>} Le centre de l'utilisateur, ou null en cas d'erreur.
   */
  const getUserCenterById = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      const center = await centerService.getUserCenterById(userId);
      if (!centers.value.some((c) => c._id === center._id)) {
        centers.value.push(center);
      }
      return center;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération du centre de l\'utilisateur';
      return null;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Crée un nouveau centre.
   * @param {Object} centerData - Les données du nouveau centre.
   */
  const createCenter = async (centerData) => {
    try {
      loading.value = true;
      error.value = null;
      const newCenter = await centerService.createCenter(centerData);
      centers.value.push(newCenter);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la création du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour un centre.
   * @param {string} centerId - L'ID du centre.
   * @param {Object} centerData - Les nouvelles données du centre.
   */
  const updateCenter = async (centerId, centerData) => {
    try {
      loading.value = true;
      error.value = null;
      const updatedCenter = await centerService.updateCenter(centerId, centerData);
      const index = centers.value.findIndex(c => c._id === centerId);
      if (index !== -1) {
        centers.value[index] = updatedCenter;
      }
      if (currentCenter.value?._id === centerId) {
        currentCenter.value = updatedCenter;
      }
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Supprime un centre.
   * @param {string} centerId - L'ID du centre à supprimer.
   */
  const deleteCenter = async (centerId) => {
    try {
      loading.value = true;
      error.value = null;
      await centerService.deleteCenter(centerId);
      centers.value = centers.value.filter(c => c._id !== centerId);
      if (currentCenter.value?._id === centerId) {
        currentCenter.value = null;
      }
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };


  /**
   * Récupère les rotations actives de tous les centres.
   */
  const fetchActiveRotations = async () => {
    try {
      loading.value = true;
      error.value = null;
      const data = await centerService.fetchActiveRotations();
      activeRotationsByCenter.value = data;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des rotations actives';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les rotations actives d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   */
  const fetchActiveRotationOfCenter = async (centerId) => {
    try {
      loading.value = true;
      error.value = null;
      const data = await centerService.fetchActiveRotationOfCenter(centerId);
      activeRotationsByCenter.value[centerId] = data;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des rotations actives du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAdminsByCenter = async () => {
    try {
      loading.value = true;
      error.value = null;
      const response = await centerService.fetchAdminsByCenter();
      adminsByCenter.value = response;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des administrateurs par centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchUsersCountByCenter = async () => {
    try {
      loading.value = true;
      error.value = null;
      const response = await centerService.fetchUsersCountByCenter();
      usersCountByCenter.value = response;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération du nombre d\'utilisateurs par centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };  

  return {
    // State
    centers,
    currentCenter,
    loading,
    error,
    usersByCenter,
    usersCountByCenter,
    adminsByCenter,
    activeRotationsByCenter,
 
    // Actions
    fetchCenters,
    fetchUsersByCenter,
    getUserCenterById,
    createCenter,
    updateCenter,
    deleteCenter,
    fetchActiveRotations,
    fetchActiveRotationOfCenter,
    fetchAdminsByCenter,
    fetchUsersCountByCenter
  };
});
