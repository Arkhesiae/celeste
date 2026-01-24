/**
 * Configuration de l'API
 */
import { useAuthStore } from '@/stores/authStore';
import router from '@/router';
import { authService } from '@/services/authService';

export const API_URL = import.meta.env.VITE_API_URL;

// File d'attente pour les requêtes en attente de refresh token
let refreshPromise = null;
const requestQueue = [];


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
  return fetch(`${API_URL}${url}`, {
    ...options,
    headers: getAuthHeaders(),
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
    const authStore = useAuthStore();
    if (!authStore.accessToken) {
      authStore.clearAuth();
      throw new Error('AUTH_REQUIRED');
    }
    return handle401(retryFn);  
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


// /**
//  * Gère les requêtes 401 (Unauthorized)
//  * @param {Function} retryFn - La fonction à réessayer
//  * @returns {Promise<any>} La réponse gérée
//  */
// const handle401 = async (retryFn) => {
//   const authStore = useAuthStore();

//   if (refreshPromise) {
  
//     return new Promise((resolve, reject) => {
//       requestQueue.push({ retryFn, resolve, reject });
//     }).then(async () => {
//       const retryResponse = await retryFn();
//       return handleResponse(retryResponse, retryFn, false);
//     });
//   }

//   refreshPromise = (async () => {
//     try {
   
//       const data = await authService.refreshToken();
//       authStore.setAccessToken(data.accessToken);
 
//       const queue = [...requestQueue];
//       requestQueue.length = 0;
//       queue.forEach(({ resolve }) => resolve());
//     } catch (err) {
//       const queue = [...requestQueue];
//       requestQueue.length = 0;
//       queue.forEach(({ reject }) => reject(err));

//       authStore.clearAuth();
//       router.push('/login');
//       throw err;
//     } finally {
//       refreshPromise = null;
//     }
//   })();

//   await refreshPromise;

//   const retryResponse = await retryFn();
//   return handleResponse(retryResponse, retryFn, false);
// };

/**
 * Gère les erreurs 401 avec rafraîchissement du token
 * @param {Function} retryFn
 */
const handle401 = async (retryFn) => {
  const authStore = useAuthStore();

  if (!refreshPromise) {
    refreshPromise = refreshToken(authStore);
  }

  await refreshPromise;

  const response = await retryFn();
  return handleResponse(response, retryFn, false);
};


const refreshToken = async (authStore) => {
  try {
    const data = await authService.refreshToken();
    authStore.setAccessToken(data.accessToken);
  } catch (err) {
    authStore.clearAuth();
    router.push('/login');
    throw err;
  } finally {
    refreshPromise = null;
  }
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