/**
 * Configuration de l'API
 */
import { useAuthStore } from '@/stores/authStore';
import router from '@/router';
import { authService } from '@/services/authService';

export const API_URL = import.meta.env.VITE_API_URL;

// File d'attente pour les requêtes en attente de refresh token
let refreshPromise = null;


/**
 * Fetch API avec retry automatique après refresh token
 * @param {string} url
 * @param {RequestInit} options
 */
export const apiFetch = async (url, options = {}) => {
  const response = await doFetch(url, options);
  return handleResponse(response, () => doFetch(url, options), options.allowRetry ?? true);
};


/**
 * Fetch brut avec headers d'authentification
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 */
const doFetch = (url, options = {}) => {
  const { allowRetry, headers, ...fetchOptions } = options;
  return fetch(`${API_URL}${url}`, {
    credentials: 'include',
    ...fetchOptions,
    headers: {
      ...getAuthHeaders(),
      ...(headers || {}),
    },
  });
};


/**
 * Gère les réponses API avec distinction des conflits métier (409)
 * @param {Response} response
 * @returns {Promise<any>}
 */
export const handleResponse = async (response, retryFn, retry = true) => {
  const data = await response.json().catch(() => ({})); // évite crash si pas de JSON

  // Cas particulier : conflit métier → ne pas throw, mais retourner proprement
  if (response.status === 409) {
    return {
      ...data,
      needsApproval: true,
      ok: false, // explicite mais non bloquant
    };
  }

  if (response.status === 401 && data.code === 'INVALID_ACCESS_TOKEN' && retryFn && retry) {
    console.warn('==> 401 Unauthorized, retrying...');
    return handle401(retryFn);  
  }


  // Cas d’erreur classique
  if (!response.ok) {
    const isMissingRefresh =
      response.status === 401 && data.code === 'AUTH_TOKEN_MISSING';
    if (!isMissingRefresh) {
      console.error('API Error:', data);
    }
    const customError = new Error(data.message || data.error || 'Une erreur est survenue');
    customError.status = response.status;
    customError.code = data.code;
    throw customError;
  }

  // Succès normal
  return data;
};




/**
 * Gère les erreurs 401 avec rafraîchissement du token
 * @param {Function} retryFn
 */
const handle401 = async (retryFn) => {
  const authStore = useAuthStore();

  if (!refreshPromise) {
    refreshPromise = refreshToken(authStore).finally(() => {
      refreshPromise = null;
    });
  }

  try {
    await refreshPromise;
  } catch {
    throw new Error('SESSION_EXPIRED');
  }

  const response = await retryFn();
  return handleResponse(response, retryFn, false);
};


const refreshToken = async (authStore) => {
  try {
    const data = await authService.refreshToken();
    authStore.setAccessToken(data.accessToken);
    return data;
  } catch (err) {
    authStore.clearAuth();
    router.push('/login');
    throw err;
  }
};



/**
 * Fonction utilitaire pour obtenir les headers d'authentification
 * @returns {Object} Les headers d'authentification
 */
export const getAuthHeaders = () => {
  const authStore = useAuthStore();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authStore.accessToken) {
    headers.Authorization = `Bearer ${authStore.accessToken}`;
  }
  return headers;
};
