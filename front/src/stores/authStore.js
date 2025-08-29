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
  const phone = ref('');
  const birthDate = ref('');
  const userId = ref(null);
  const accessToken = ref('');
  const isLoggedIn = ref(false);
  const isAdmin = ref(false);
  const adminType = ref(''); // 'localAdmin' ou 'masterAdmin'
  const centerId = ref('');
  const preferences = ref({
    theme: false
  });
  const avatar = ref('');
  const status = ref(''); // Ajout du statut de l'utilisateur

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
  const loadFromLocalStorage = async () => {
    try {
      console.log("loadFromLocalStorage");
      const userData = JSON.parse(localStorage.getItem(STORAGE_KEY));
    
      if (userData?.accessToken) {
        setUser(userData);
        await validateAccessToken();

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
    console.log("saveToLocalStorage");
    try {
      const dataToSave = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate,
        accessToken: data.accessToken,
        isAdmin: data.isAdmin,
        adminType: data.adminType,
        userId: data.userId,
        centerId: data.centerId,
        preferences: data.preferences,
        avatar: data.avatar,
        status: data.status
      } 
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
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
    phone.value = data.phone || '';
    birthDate.value = data.birthDate || '';
    accessToken.value = data.accessToken;
    isAdmin.value = data.isAdmin || false;
    adminType.value = data.adminType || '';
    centerId.value = data.centerId || '';
    preferences.value = data.preferences || { theme: false };
    avatar.value = data.avatar || '';
    status.value = data.status || 'pending'; // Ajout du statut
   

    saveToLocalStorage(data);
  };

  /**
   * Déconnecte l'utilisateur et supprime les données du localStorage.
   */
  const logOut = () => {
    name.value = '';
    email.value = '';
    phone.value = '';
    birthDate.value = '';
    userId.value = null;
    accessToken.value = '';
    isAdmin.value = false;
    adminType.value = '';
    centerId.value = '';
    preferences.value = { theme: false };
    avatar.value = '';
    status.value = ''; // Réinitialisation du statut
    isLoggedIn.value = false;
    localStorage.removeItem(STORAGE_KEY);
  
  };

  /**
   * Valide le token d'accès.
   * @returns {Promise<boolean>} True si le token est valide.
   */
  const validateAccessToken = async () => {
   try {
      if (!accessToken.value) {
        logOut();
        throw new Error('Aucun token d\'accès trouvé.');
      }

      if (isTokenExpired()) {
        logOut();
        throw new Error('Le token d\'accès a expiré.');
      }

      if (isTokenExpiringSoon()) {
        await refreshToken();
      }
      isLoggedIn.value = true;
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
      saveToLocalStorage(data);
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
  

      preferences.value = { ...preferences.value, ...preferences };
      const data = await userService.updateUserPreferences(userId.value, preferences.value);
      const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      existingData.preferences = preferences.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

    
    } catch (error) {
      console.error('Erreur lors de la mise à jour des préférences:', error);
      throw error;
    }
  };

  const updateAvatar = async (formData) => {
    try {
      const data = await userService.updateAvatar(userId.value, formData);
      avatar.value = data.avatar;

      const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      existingData.avatar = avatar.value;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));

      isLoggedIn.value = true;
    } catch (err) {
      console.error('Erreur lors de la mise à jour de l\'avatar:', err.message);
      throw err;
    }
  };

  return {
    name,
    email,
    phone,
    birthDate,
    isLoggedIn,
    accessToken,
    isAdmin,
    adminType,
    userId,
    centerId,
    
    preferences,
    avatar,
    status, // Ajout du statut dans le retour
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
