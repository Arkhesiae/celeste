import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authService } from '@/services/authService';
import { userService } from '@/services/userService';
import { emptyAllStores } from '@/utils/emptyAllStores';
import { useInitializationStore } from '@/stores/initializationStore';

/**
 * Store Pinia pour gérer l'état de l'authentification.
 */
export const useAuthStore = defineStore('auth', () => {
  const userData = ref({});
  const accessToken = ref();
  const isLoggedIn = ref(false);
  const isAuthReady = ref(false);
  const isCheckingAuth = ref(false);
  const initializationStore = useInitializationStore();

  /**
   * Définit les données de l'utilisateur.
   * @param {Object} data - Les données de l'utilisateur.
   */
  const setUser = (data) => {
    userData.value = data.userData;
    accessToken.value = data.accessToken;
  };

  const setAccessToken = (newAccessToken) => {
    accessToken.value = newAccessToken;
  };

  const clearAuth = () => {
    userData.value = {};
    accessToken.value = '';
    isLoggedIn.value = false;
  };

  /**
   * Initialise l'authentification.
   */
  const initializeAuth = async () => {
    if (isAuthReady.value || isCheckingAuth.value) return;

    try {
      isCheckingAuth.value = true;
      const data = await authService.refreshToken();
      setUser(data);
      isLoggedIn.value = true;
    } catch {
      // Pas de cookie refresh = non connecté (cas normal au premier chargement)
      clearAuth();
    } finally {
      isAuthReady.value = true;
      isCheckingAuth.value = false;
    }
  };

  /**
   * Connecte un utilisateur.
   * @param {Object} credentials - Les identifiants de l'utilisateur (email, password).
   */
  const logIn = async (credentials) => {
    try {
      const result = await authService.login(credentials);
      setUser(result);
      isLoggedIn.value = true;
    } catch (err) {
      console.error('Erreur lors de la connexion:', err.message);
      throw err;
    }
  };

  /**
   * Déconnecte l'utilisateur.
   */
  const logOut = async () => {
    clearAuth();
    emptyAllStores();
    initializationStore.setAppReady(false);

    try {
      await authService.logout();
    } catch (err) {
      // Logout API may fail if already logged out — local state is already cleared
      console.error('Erreur lors de la déconnexion:', err.message);
    }
  };

  /**
   * Met à jour les préférences utilisateur.
   * @param {Object} preferences - Les nouvelles préférences.
   */
  const updateUserPreferences = async (preferences) => {
    if (!isLoggedIn.value) return;

    try {
      const userId = userData.value.userId;
      const updatedPreferences = { ...userData.value.preferences, ...preferences };
      userData.value.preferences = updatedPreferences;
      await userService.updateUserPreferences(userId, updatedPreferences);
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  };

  /**
   * Met à jour l'avatar de l'utilisateur.
   * @param {FormData} formData - Les données du formulaire contenant l'avatar.
   */
  const updateAvatar = async (formData) => {
    if (!isLoggedIn.value) return;

    try {
      const userId = userData.value.userId;
      const data = await userService.updateAvatar(userId, formData);
      userData.value.avatar = data.avatar;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'avatar:', err.message);
      throw err;
    }
  };

  return {
    userData,
    accessToken,
    isLoggedIn,
    isAuthReady,
    isCheckingAuth,
    initializeAuth,
    clearAuth,
    setAccessToken,
    setUser,
    logIn,
    logOut,
    updateUserPreferences,
    updateAvatar,
  };
});