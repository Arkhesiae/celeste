import {defineStore} from 'pinia';
import {ref} from 'vue';
import {authService} from '@/services/authService';
import {jwtDecode} from "jwt-decode";
import { userService } from '@/services/userService';

const STORAGE_KEY = 'authData';
const TOKEN_EXPIRATION_THRESHOLD = 5 * 60; // 5 minutes en secondes

/**
 * Store Pinia pour gérer l'état de l'authentification.
 * @module authStore
 */
export const useAuthStore = defineStore('auth', () => {
  // State
  const name = ref('');
  const email = ref('');
  const userId = ref(null);
  const accessToken = ref('');
  const isLoggedIn = ref(false);
  const isAdmin = ref(false);
  const adminType = ref(''); // 'localAdmin' ou 'masterAdmin'
  const centerId = ref('');
  const error = ref(null);
  const preferences = ref({
    theme: false
  });
  const avatar = ref('');

  // Getters
  const isTokenExpired = () => {
    if (!accessToken.value) return true;
    try {
      const decodedToken = jwtDecode(accessToken.value);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp < currentTime;
    } catch {
      return true;
    }
  };

  const isTokenExpiringSoon = () => {
    if (!accessToken.value) return true;
    try {
      const decodedToken = jwtDecode(accessToken.value);
      const currentTime = Math.floor(Date.now() / 1000);
      return decodedToken.exp - currentTime < TOKEN_EXPIRATION_THRESHOLD;
    } catch {
      return true;
    }
  };

  // Actions
  /**
   * Charge les données de l'utilisateur depuis le localStorage.
   */
  const loadFromLocalStorage = () => {
    try {
      const userData = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (userData?.accessToken) {
        setUser(userData);
        validateAccessToken();
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      logOut();
    }
  };

  /**
   * Sauvegarde les données dans le localStorage.
   */
  const saveToLocalStorage = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des données:', err);
      throw new Error('Impossible de sauvegarder les données d\'authentification');
    }
  };

  /**
   * Définit les données de l'utilisateur et les sauvegarde dans le localStorage.
   * @param {Object} data - Les données de l'utilisateur.
   */
  const setUser = (data) => {
    name.value = data.name;
    userId.value = data.userId;
    email.value = data.email;
    accessToken.value = data.accessToken;
    isLoggedIn.value = true;
    isAdmin.value = data.isAdmin || false;
    adminType.value = data.adminType || '';
    centerId.value = data.centerId || '';
    preferences.value = data.preferences || { theme: false };
    avatar.value = data.avatar || '';
    error.value = null;

    saveToLocalStorage({
      name: name.value,
      email: email.value,
      accessToken: accessToken.value,
      isAdmin: isAdmin.value,
      adminType: adminType.value,
      userId: userId.value,
      centerId: centerId.value,
      preferences: preferences.value,
      avatar: avatar.value
    });
  };

  /**
   * Déconnecte l'utilisateur et supprime les données du localStorage.
   */
  const logOut = () => {
    name.value = '';
    email.value = '';
    userId.value = null;
    accessToken.value = '';
    isLoggedIn.value = false;
    isAdmin.value = false;
    adminType.value = '';
    centerId.value = '';
    preferences.value = { theme: false };
    avatar.value = '';
    error.value = null;
    localStorage.removeItem(STORAGE_KEY);
  };

  /**
   * Valide le token d'accès.
   * @returns {Promise<boolean>} True si le token est valide.
   */
  const validateAccessToken = async () => {
    if (!accessToken.value) {
      logOut();
      throw new Error('Aucun token d\'accès trouvé.');
    }

    try {
      if (isTokenExpired()) {
        logOut();
        throw new Error('Le token d\'accès a expiré.');
      }

      if (isTokenExpiringSoon()) {
        await refreshToken();
      }

      return true;
    } catch (err) {
      console.error('Échec de la validation du token:', err.message);
      logOut();
      throw err;
    }
  };

  /**
   * Connecte un utilisateur.
   * @param {Object} credentials - Les identifiants de l'utilisateur (email, password).
   */
  const logIn = async (credentials) => {
    try {
      error.value = null;
      const result = await authService.login(credentials);
      setUser({
        name: result.name,
        email: credentials.email,
        isAdmin: result.isAdmin,
        adminType: result.adminType,
        avatar: result.avatar,
        userId: result.userId,
        accessToken: result.accessToken,
        centerId: result.centerId,
        preferences: result.preferences || { theme: false }
      });
    } catch (err) {
      error.value = err.message || 'Erreur lors de la connexion';
      throw err;
    }
  };

  /**
   * Rafraîchit le token d'accès.
   */
  const refreshToken = async () => {
    try {
      error.value = null;
      const data = await authService.refreshToken(accessToken.value);
      accessToken.value = data.accessToken;
      saveToLocalStorage({
        name: name.value,
        email: email.value,
        accessToken: accessToken.value,
        isAdmin: isAdmin.value,
        adminType: adminType.value,
        userId: userId.value,
        centerId: centerId.value,
        preferences: preferences.value,
        avatar: avatar.value
      });
    } catch (err) {
      console.error('Échec du rafraîchissement du token:', err.message);
      error.value = err.message || 'Erreur lors du rafraîchissement du token';
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
      
      // Mise à jour locale
      preferences.value = { ...preferences.value, ...preferences };
      
      // Mise à jour sur le backend
      await userService.updateUserPreferences(userId.value, preferences);
      
      // Sauvegarde dans le localStorage
      saveToLocalStorage({
        name: name.value,
        email: email.value,
        accessToken: accessToken.value,
        isAdmin: isAdmin.value,
        adminType: adminType.value,
        userId: userId.value,
        centerId: centerId.value,
        preferences: preferences.value,
        avatar: avatar.value
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  };

  const updateAvatar = async (formData) => {
    try {
      const data = await userService.updateAvatar(userId.value, formData);
      avatar.value = data.avatar;
      saveToLocalStorage({
        name: name.value,
        email: email.value,
        accessToken: accessToken.value,
        isAdmin: isAdmin.value,
        adminType: adminType.value,
        userId: userId.value,
        centerId: centerId.value,
        preferences: preferences.value,
        avatar: avatar.value
      });
    } catch (err) {
      error.value = err.message;
      throw err;
    }
  };

  return {
    name,
    email,
    isLoggedIn,
    accessToken,
    isAdmin,
    adminType,
    userId,
    centerId,
    error,
    preferences,
    avatar,
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
