/**
 * Service pour gérer les appels API liés à la création de compte.
 * @module accountCreationService
 */
import { API_URL, handleResponse } from '../config/api';

export const accountCreationService = {
  /**
   * Crée un nouveau compte utilisateur.
   * @param {Object} userData - Les données de l'utilisateur.
   * @returns {Promise<Object>} L'utilisateur créé.
   */
  async createAccount(userData) {
    const response = await fetch(`${API_URL}/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  /**
   * Vérifie si un email est déjà utilisé.
   * @param {string} email - L'email à vérifier.
   * @returns {Promise<boolean>} True si l'email est disponible.
   */
  async checkEmailAvailability(email) {
    const response = await fetch(`${API_URL}/users/check-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },

  /**
   * Active un compte utilisateur.
   * @param {string} token - Le token d'activation.
   * @returns {Promise<Object>} Le compte activé.
   */
  async activateAccount(token) {
    const response = await fetch(`${API_URL}/auth/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    return handleResponse(response);
  },

  /**
   * Récupère les informations d'un utilisateur par son email.
   * @param {string} email - L'email de l'utilisateur.
   * @returns {Promise<Object>} Les informations de l'utilisateur.
   */
  async getUserInfo(email) {
    const response = await fetch(`${API_URL}/users/info/${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return handleResponse(response);
  }
};
