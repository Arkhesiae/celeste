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
  },

  /**
   * Met à jour le numéro de téléphone de l'utilisateur.
   * @param {string} newPhone - Le nouveau numéro de téléphone.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updatePhone(newPhone) {
    const response = await fetch(`${API_URL}/users/update-phone`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ phone: newPhone })
    });
    return handleResponse(response);
  },

  /**
   * Supprime le numéro de téléphone de l'utilisateur.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async deletePhone() {
    const response = await fetch(`${API_URL}/users/delete-phone`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  /**
   * Met à jour la date de naissance de l'utilisateur.
   * @param {string} newBirthDate - La nouvelle date de naissance.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updateBirthDate(newBirthDate) {
    const response = await fetch(`${API_URL}/users/update-birthDate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ birthDate: newBirthDate })
    });
    return handleResponse(response);
  }
}; 