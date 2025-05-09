/**
 * Service pour gérer les appels API liés à l'authentification.
 * @module authService
 */
import { API_URL, handleResponse } from '../config/api';

export const authService = {
  /**
   * Connecte un utilisateur.
   * @param {string} email - L'email de l'utilisateur.
   * @param {string} password - Le mot de passe de l'utilisateur.
   * @returns {Promise<Object>} Les informations d'authentification.
   */
  async login(credentials) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    return handleResponse(response);
  },

  /**
   * Déconnecte l'utilisateur.
   * @returns {Promise<void>}
   */
  async logout() {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return handleResponse(response);
  },

  /**
   * Rafraîchit le token d'authentification.
   * @param {string} refreshToken - Le token de rafraîchissement.
   * @returns {Promise<Object>} Les nouveaux tokens.
   */
  async refreshToken(refreshToken) {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    return handleResponse(response);
  },

  /**
   * Vérifie si l'utilisateur est authentifié.
   * @returns {Promise<boolean>} True si l'utilisateur est authentifié.
   */
  async checkAuth() {
    const response = await fetch(`${API_URL}/auth/check`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return handleResponse(response);
  }
};
