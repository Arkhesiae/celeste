import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { userService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';

/**
 * Store Pinia pour gérer l'état des utilisateurs.
 * @module userStore
 */
export const useUserStore = defineStore('user', () => {
  // State
  const users = ref([]);
  const usersGroupedByTeam = ref([]);
  const currentUser = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const authStore = useAuthStore();

  // Getters
  const getUsers = computed(() => users.value);
  const getUsersGroupedByTeam = computed(() => usersGroupedByTeam.value);
  const getCurrentUser = computed(() => currentUser.value);
  const isLoading = computed(() => loading.value);
  const getError = computed(() => error.value);

  // Actions
  /**
   * Récupère tous les utilisateurs.
   */
  const fetchUsers = async () => {
    try {
      loading.value = true;
      error.value = null;
      users.value = await userService.getUsers();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des utilisateurs';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les utilisateurs d'un centre spécifique.
   */
  const fetchUsersOfCenter = async () => {
    try {
      loading.value = true;
      error.value = null;
      users.value = await userService.fetchUsersByCenter(authStore.centerId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des utilisateurs du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les utilisateurs d'un centre spécifique.
   */
  const fetchUsersByCenter = async (centerId) => {
    try {
      loading.value = true;
      error.value = null;
      users.value = await userService.fetchUsersByCenter(centerId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des utilisateurs du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };



  /**
   * Récupère l'utilisateur actuellement connecté.
   */
  const fetchCurrentUser = async () => {
    try {
      loading.value = true;
      error.value = null;
      currentUser.value = await userService.getCurrentUser();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération de l\'utilisateur courant';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Attribue un centre à un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {string} centerId - L'ID du centre.
   */
  const assignCenter = async (userId, centerId) => {
    try {
      loading.value = true;
      error.value = null;
      await userService.updateUser(userId, { centerId });
      await fetchUsers();
    } catch (err) {
      error.value = err.message || 'Erreur lors de l\'attribution du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Approuve un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  const approveUser = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      await userService.updateUser(userId, { status: 'approved' });
      await fetchUsers();
    } catch (err) {
      error.value = err.message || 'Erreur lors de l\'approbation de l\'utilisateur';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Supprime un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  const deleteUser = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      await userService.deleteUser(userId);
      await fetchUsers();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression de l\'utilisateur';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Rend un utilisateur administrateur.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  const makeAdmin = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      await userService.updateUser(userId, { isLocalAdmin: true });
      await fetchUsers();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la promotion de l\'utilisateur en administrateur';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les utilisateurs groupés par équipe pour un centre.
   * @param {string} centerId - L'ID du centre.
   */
  const fetchUsersAndGroupByTeam = async (centerId) => {
    try {
      loading.value = true;
      error.value = null;
      usersGroupedByTeam.value = await userService.fetchUsersAndGroupByTeam(centerId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des utilisateurs groupés par équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    users,
    usersGroupedByTeam,
    currentUser,
    loading,
    error,
    // Getters
    getUsers,
    getUsersGroupedByTeam,
    getCurrentUser,
    isLoading,
    getError,
    // Actions
    fetchUsers,
    fetchUsersOfCenter,
    fetchUsersByCenter,
    fetchCurrentUser,
    assignCenter,
    approveUser,
    deleteUser,
    makeAdmin,
    fetchUsersAndGroupByTeam
  };
});
