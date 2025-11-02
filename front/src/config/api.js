/**
 * Configuration de l'API
 */
import { useAuthStore } from '@/stores/authStore';

export const API_URL = import.meta.env.VITE_API_URL;

/**
 * Gère les réponses API avec distinction des conflits métier (409)
 * @param {Response} response
 * @returns {Promise<any>}
 */
export const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({})); // évite crash si pas de JSON

  // Cas particulier : conflit métier → ne pas throw, mais retourner proprement
  if (response.status === 409) {
    return {
      ...data,
      needsApproval: true,
      ok: false, // explicite mais non bloquant
    };
  }

  // Cas d’erreur classique
  if (!response.ok) {
    console.error('API Error:', data);
    const customError = new Error(data.message || data.error || 'Une erreur est survenue');
    customError.status = response.status;
    throw customError;
  }

  // Succès normal
  return data;
};

/**
 * Fonction utilitaire pour obtenir les headers d'authentification
 * @returns {Object} Les headers d'authentification
 */
export const getAuthHeaders = () => {
  const authStore = useAuthStore();
  return {
    'Authorization': `Bearer ${authStore.accessToken}`,
    'Content-Type': 'application/json'
  };
}; 