/**
 * Service pour gérer les appels API liés à la création de compte.
 * @module accountCreationService
 */
import { apiFetch } from '../config/api';

export const accountCreationService = {
  /**
   * Crée un nouveau compte utilisateur.
   * @param {Object} userData - Les données de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur créé.
   */
  async createAccount(userData) {
    const response = await apiFetch(`/users/create`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return response;
  },

  /**
   * Vérifie si un email est déjà utilisé.
   * @param {string} email - L'email à vérifier.
   * @returns {Promise<boolean>} True si l'email est disponible.
   */
  async checkEmailAvailability(email) {
    const response = await apiFetch(`/users/check-email`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return response;
  },

  /**
   * Active un compte utilisateur.
   * @param {string} token - Le token d'activation.
   * @returns {Promise<Object>} Le compte activé.
   */
  async activateAccount(token) {
    const response = await apiFetch(`/auth/activate`, {
      method: 'POST',
      body: JSON.stringify({ token })
    });
    return response;
  },

  /**
   * Récupère les informations d'un utilisateur par son email.
   * @param {string} email - L'email de l'utilisateur.
   * @returns {Promise<Object>} Les informations de l'utilisateur.
   */
  async getUserInfo(email) {
    const response = await apiFetch(`/users/info/${encodeURIComponent(email)}`, {
      method: 'GET',
    });
    return response;
  }
};
