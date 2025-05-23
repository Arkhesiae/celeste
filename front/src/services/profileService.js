import { API_URL, handleResponse, getAuthHeaders } from '@/config/api';

export const profileService = {
  /**
   * Met à jour l'email de l'utilisateur.
   * @param {string} newEmail - Le nouvel email.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updateEmail(newEmail) {
    const response = await fetch(`${API_URL}/users/update-email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ email: newEmail })
    });
    return handleResponse(response);
  }
}; 