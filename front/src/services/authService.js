/**
 * Service pour gérer les appels API liés à l'authentification.
 * @module authService
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';

export const authService = {
  /**
   * Connecte un utilisateur.
   * @param {string} email - L'email de l'utilisateur.
   * @param {string} password - Le mot de passe de l'utilisateur.
   * @returns {Promise<Object>} Les informations d'authentification.
   */
  async login(credentials) {
    console.log(credentials);
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
  },

  /**
   * Demande une réinitialisation de mot de passe.
   * @param {string} email - L'email de l'utilisateur.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async requestPasswordReset(email) {
    const response = await fetch(`${API_URL}/auth/reset-password-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    return handleResponse(response);
  },

  /**
   * Réinitialise le mot de passe avec un token.
   * @param {string} token - Le token de réinitialisation.
   * @param {string} newPassword - Le nouveau mot de passe.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async resetPassword(token, newPassword) {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, newPassword })
    });
    return handleResponse(response);
  },

  /**
   * Vérifie le mot de passe actuel de l'utilisateur.
   * @param {string} currentPassword - Le mot de passe actuel.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async verifyCurrentPassword(currentPassword) {
    const response = await fetch(`${API_URL}/auth/verify-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword })
    });
    return handleResponse(response);
  },

  /**
   * Met à jour le mot de passe de l'utilisateur.
   * @param {string} newPassword - Le nouveau mot de passe.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updatePassword(newPassword) {
    const response = await fetch(`${API_URL}/auth/update-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword })
    });
    return handleResponse(response);
  }
};
