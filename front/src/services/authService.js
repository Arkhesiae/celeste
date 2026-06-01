/**
 * Service pour gérer les appels API liés à l'authentification.
 * @module authService
 */
import { apiFetch } from '../config/api';

export const authService = {
  /**
   * Connecte un utilisateur.
   * @param {string} email - L'email de l'utilisateur.
   * @param {string} password - Le mot de passe de l'utilisateur.
   * @returns {Promise<Object>} Les informations d'authentification.
   */
  async login(credentials) {
    const response = await apiFetch(`/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(credentials),
      allowRetry: false
    });
    return response;
  },

  /**
   * Déconnecte l'utilisateur.
   * @returns {Promise<void>}
   */
  async logout() {
    const response = await apiFetch(`/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      allowRetry: false
    });
    return response;
  },

  /**
   * Rafraîchit le token d'authentification.
   * Le refresh token est automatiquement envoyé via les cookies HTTP-only.
   * @returns {Promise<Object>} Les nouveaux tokens.
   */
  async refreshToken() {
      const response = await apiFetch(`/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        allowRetry: false
      });
      return response;
  },

  /**
   * Demande une réinitialisation de mot de passe.
   * @param {string} email - L'email de l'utilisateur.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async requestPasswordReset(email) {
    const response = await apiFetch(`/auth/reset-password-request`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return response;
  },

  /**
   * Réinitialise le mot de passe avec un token.
   * @param {string} token - Le token de réinitialisation.
   * @param {string} newPassword - Le nouveau mot de passe.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async resetPassword(token, newPassword) {
    const response = await apiFetch(`/auth/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
    return response;
  },

  /**
   * Vérifie le mot de passe actuel de l'utilisateur.
   * @param {string} currentPassword - Le mot de passe actuel.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async verifyCurrentPassword(currentPassword) {
    const response = await apiFetch(`/auth/verify-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword })
    });
    return response;
  },

  /**
   * Met à jour le mot de passe de l'utilisateur.
   * @param {string} newPassword - Le nouveau mot de passe.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updatePassword(newPassword) {
    const response = await apiFetch(`/auth/update-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
    return response;
  }
};
