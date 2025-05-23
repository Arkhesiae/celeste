/**
 * Service pour gérer les opérations liées aux points
 */
import { API_URL, handleResponse, getAuthHeaders } from '../config/api';


export const pointService = {
/** 
 * Récupère les points de l'utilisateur
 * @param {string} id - L'ID de l'utilisateur
 * @returns {Promise<Object>} Les points de l'utilisateur
 */
  getUserPoints: async (id) => {
    const response = await fetch(`${API_URL}/users/${id}/points`, {
      method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
  },

/**
 * Effectue un transfert de points entre utilisateurs
 * @param {string} fromUserId - L'ID de l'utilisateur qui envoie les points
 * @param {string} toUserId - L'ID de l'utilisateur qui reçoit les points
 * @param {number} amount - Le montant des points à transférer
 * @param {string} description - Description optionnelle du transfert
 * @param {string} scheduledDate - Date prévue pour le virement différé (optionnel)
 * @returns {Promise<Object>} La transaction créée
 */
  transferPoints: async (fromUserId, toUserId, amount, description = '', scheduledDate = null) => {
    const response = await fetch(`${API_URL}/users/${fromUserId}/points/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
      toUserId,
      amount,
      description,
      type: 'transfer',
      scheduledDate
    }),
  });
  return handleResponse(response);
  },

/**
 * Récupère l'historique des transactions d'un utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @param {number} limit - Nombre maximum de transactions à récupérer
 * @returns {Promise<Array>} Liste des transactions
 */
  getTransactionHistory: async (userId, limit = 10) => {
    const response = await fetch(`${API_URL}/users/${userId}/transactions?limit=${limit}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
      },

/**
 * Récupère les transactions en attente d'un utilisateur
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<Array>} Liste des transactions en attente
 */
  getPendingTransactions: async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}/transactions/pending`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
}; 