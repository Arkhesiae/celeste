// /**
//  * Service pour gérer les appels API liés aux notifications.
//  * @module notificationService
//  */
// import { apiFetch } from '../config/api';

// export const notificationService = {
//   /**
//    * Récupère toutes les notifications.
//    * @returns {Promise<Array>} Liste des notifications.
//    */
//   async getNotifications(userId) {
//     const response = await apiFetch(`/notifications/${userId}`, {
//       method: 'GET'
//     });
//     return response;
//   },

//   /**
//    * Marque une notification comme lue.
//    * @param {string} id - L'ID de la notification.
//    * @returns {Promise<Object>} La notification mise à jour.
//    */
//   async markAsRead(id) {
//     const response = await apiFetch(`/notifications/${id}/read`, {
//       method: 'POST',
//     });
//     return response;
//   },

//   /**
//    * Marque toutes les notifications comme lues.
//    * @returns {Promise<void>}
//    */
//   async markAllAsRead() {
//     const response = await apiFetch(`/notifications/read-all`, {
//       method: 'POST',
//     });
//     return response;
//   },

//   async clearNotifications(userId) {
//         const response = await apiFetch(`/notifications/${userId}/clear`, {
//         method: 'DELETE'
//       });
//     return response;
//   },
// }; 