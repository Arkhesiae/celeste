/**
 * Configuration de l'API
 */
import { useAuthStore } from '@/stores/authStore';

export const API_URL = 'http://192.168.1.36:3000';

/**
 * Fonction utilitaire pour gérer les réponses de l'API
 * @param {Response} response - La réponse de l'API
 * @returns {Promise<any>} Les données de la réponse
 */
export const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    console.error(error.message);
    throw new Error(error.message || error.error ||  'Une erreur est survenue');
  }
  return response.json();
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