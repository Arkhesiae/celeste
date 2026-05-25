import {defineStore} from 'pinia';
import {ref} from 'vue';
import {authService} from '@/services/authService';

import { userService } from '@/services/userService';
import { emptyAllStores } from '@/utils/emptyAllStores';
import { useInitializationStore } from '@/stores/initializationStore';
  
/**
 * Store Pinia pour gérer l'état de l'authentification.
 * @module authStore
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const userData = ref({});
  const accessToken = ref();
  const isLoggedIn = ref(false);
  const isAuthReady = ref(false);
  const isCheckingAuth = ref(false);
  const initializationStore = useInitializationStore();

  /**
   * Initialise l'authentification.
   */
  const initializeAuth = async () => {
    if (isAuthReady.value) return;
    if (isCheckingAuth.value) return;
  
    try {
      isCheckingAuth.value = true;
      const data = await authService.refreshToken();

      setUser(data);
      isLoggedIn.value = true;
    } catch (err) {
      console.error('Erreur d\'initialisation de l\'authentification:', err.message);
      logOut();
    } finally {
      isAuthReady.value = true;
      isCheckingAuth.value = false;
    }
  };

  
  // /**
  //  * Rafraîchit le token d'accès si l'utilisateur est connecté.
  //  */
  // const refreshToken = async () => {
  //   if (!isLoggedIn.value) return;

  //   try {
  //     const data = await authService.refreshToken();
  //     accessToken.value = data.accessToken;
   
  //   } catch (err) {
  //     console.error('Echec du rafraîchissement du token:', err.message);
  //     logOut();
  //     throw err;
  //   }
  // };



  /**
   * Définit les données de l'utilisateur et les sauvegarde dans le localStorage.
   * @param {Object} data - Les données de l'utilisateur.
   */
  const setUser = (data) => {
    userData.value = data.userData;
    accessToken.value = data.accessToken;
  };


  const clearAuth = () => {
    userData.value = {};
    accessToken.value = '';
    isLoggedIn.value = false;
    // isAuthReady.value = false;
  };

  /**
   * Déconnecte l'utilisateur et supprime les données du localStorage.
   */
  const logOut = async () => {
    clearAuth();
    emptyAllStores();
    initializationStore.setAppReady(false);
  
    try {
      await authService.logout();
    } catch (err) {
      console.error('Erreur lors de la déconnexion:', err.message);
      throw err;
    }
  };


  const setAccessToken = (newAccessToken) => {
    accessToken.value = newAccessToken;
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
   * Met à jour les préférences utilisateur.
   * @param {Object} preferences - Les nouvelles préférences.
   */
  const updateUserPreferences = async (preferences) => {
    try {
      if (!isLoggedIn.value) return;

      const userId = userData.value.userId;
      const currentPreferences = userData.value.preferences || {};
      const updatedPreferences = { ...currentPreferences, ...preferences };
      userData.value.preferences = updatedPreferences;

      const data = await userService.updateUserPreferences(userId, updatedPreferences);

      console.log('data', data);

    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  };

  const updateAvatar = async (formData) => {
    try {
      if (!isLoggedIn.value) return;
      
      const userId = userData.value.userId;
      const data = await userService.updateAvatar(userId, formData);
      
      userData.value.avatar = data.avatar;

      // const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      // existingData.userData = { ...existingData.userData, avatar: data.avatar };
      // localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

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
    logOut,
    logIn,
   // refreshToken,
    updateUserPreferences,
    updateAvatar
  };
});
