import {defineStore} from 'pinia';
import {ref, computed} from 'vue';
import {authService} from '@/services/authService';
import {jwtDecode} from "jwt-decode";
import { userService } from '@/services/userService';
import { emptyAllStores } from '@/utils/emptyAllStores';

const STORAGE_KEY = 'authData';
const TOKEN_EXPIRATION_THRESHOLD = 5 * 60; // 5 minutes en secondes

/**
 * Store Pinia pour gérer l'état de l'authentification.
 * @module authStore
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const userData = ref({});
  const accessToken = ref();
  const isLoggedIn = ref(false);

  // Getters
  const isTokenExpired = computed(() => {
    if (!accessToken.value) return true;
    try {
      const decodedToken = jwtDecode(accessToken.value);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp < currentTime;
    } catch {
      return true;
    }
  });

  const isTokenExpiringSoon = computed(() => {
    if (!accessToken.value) return true;
    try {
      const decodedToken = jwtDecode(accessToken.value);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp - currentTime < TOKEN_EXPIRATION_THRESHOLD;
    } catch {
      return true;
    }
  });

  // const isAdmin = computed(() => {
  //   return  userData.value.isAdmin;
  // });

  // Actions
  /**
   * Charge les données de l'utilisateur depuis le localStorage.
   */
  const loadFromLocalStorage = async () => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY)); 
      if (data?.accessToken) {
        setUser(data);
        isLoggedIn.value = await validateAccessToken();
        return true;
      }

    } catch (err) {
      logOut();
      throw err;
    } 
  };

  /**
   * Valide le token d'accès.
   * @returns {Promise<boolean>} True si le token est valide.
   */
  const validateAccessToken = async () => {
    try {
       if (!accessToken.value) {
         throw new Error('Aucun token d\'accès trouvé.');
       }

       if (isTokenExpired.value) {
         throw new Error('Le token d\'accès a expiré.');
       }

       if (isTokenExpiringSoon.value) {
         throw new Error('Le token d\'accès a expiré.');
        //  await refreshToken();
       }
       
       return true;
     } catch (err) {
       logOut();
       throw err;
     }
   };


  /**
   * Définit les données de l'utilisateur et les sauvegarde dans le localStorage.
   * @param {Object} data - Les données de l'utilisateur.
   */
  const setUser = (data) => {
    userData.value = data.userData;
    accessToken.value = data.accessToken;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  /**
   * Déconnecte l'utilisateur et supprime les données du localStorage.
   */
  const logOut = () => {
    userData.value = {};
    accessToken.value = '';
    isLoggedIn.value = false;
    emptyAllStores();
    localStorage.removeItem(STORAGE_KEY);
  };



  /**
   * Connecte un utilisateur.
   * @param {Object} credentials - Les identifiants de l'utilisateur (email, password).
   */
  const logIn = async (credentials) => {
    console.log("Logging in");
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
   * Rafraîchit le token d'accès.
   */
  const refreshToken = async () => {
    try {
      const data = await authService.refreshToken(accessToken.value);
      accessToken.value = data.accessToken;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Échec du rafraîchissement du token:', err.message);
      logOut();
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
      
      console.log(preferences);
      const userId = userData.value.userId;
      const currentPreferences = userData.value.preferences || {};
      const updatedPreferences = { ...currentPreferences, ...preferences };
      userData.value.preferences = updatedPreferences;

      await userService.updateUserPreferences(userId, updatedPreferences);

      const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      existingData.userData = { ...existingData.userData, preferences: updatedPreferences };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

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

      const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      existingData.userData = { ...existingData.userData, avatar: data.avatar };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'avatar:', err.message);
      throw err;
    }
  };

  return {
    userData,
    accessToken,
    isLoggedIn,
    isTokenExpired,
    isTokenExpiringSoon,
    
    
    loadFromLocalStorage,
    setUser,
    logOut,
    validateAccessToken,
    logIn,
    refreshToken,
    updateUserPreferences,
    updateAvatar
  };
});
