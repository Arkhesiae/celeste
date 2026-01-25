import { apiFetch } from '../config/api';

export const profileService = {
  /**
   * Met à jour l'email de l'utilisateur.
   * @param {string} newEmail - Le nouvel email.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updateEmail(newEmail) {
    const response = await apiFetch(`/users/update-email`, {
      method: 'POST',
      body: JSON.stringify({ email: newEmail })
    });
    return response;
  },

  /**
   * Met à jour le numéro de téléphone de l'utilisateur.
   * @param {string} newPhone - Le nouveau numéro de téléphone.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updatePhone(newPhone) {
    const response = await apiFetch(`/users/update-phone`, {
      method: 'POST',
      body: JSON.stringify({ phone: newPhone })
    });
    return response;
  },

  /**
   * Supprime le numéro de téléphone de l'utilisateur.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async deletePhone() {
    const response = await apiFetch(`/users/delete-phone`, {
      method: 'DELETE',
    });
    return response;
  },

  /**
   * Met à jour la date de naissance de l'utilisateur.
   * @param {string} newBirthDate - La nouvelle date de naissance.
   * @returns {Promise<Object>} La réponse du serveur.
   */
  async updateBirthDate(newBirthDate) {
    const response = await apiFetch(`/users/update-birthDate`, {
      method: 'POST',
      body: JSON.stringify({ birthDate: newBirthDate })
    });
    return response;
  }
}; 