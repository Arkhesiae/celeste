/**
 * Mutations de centre (`/api/center-transfer`) : l'utilisateur agit sur sa propre demande, les administrateurs lisent les demandes
 * de leur centre et acceptent celles qui y arrivent.
 * @module centerTransferService
 */
import { apiFetch } from '../config/api';

export const centerTransferService = {
  /** Ma demande en cours : { toCenter, reason, requestedAt } ou null */
  getMine() {
    return apiFetch('/center-transfer/mine', { method: 'GET' });
  },

  /** Ce que l'acceptation effacerait : { substitutions, entries, points, negativePoints } */
  preview() {
    return apiFetch('/center-transfer/preview', { method: 'GET' });
  },

  /** Dépose la demande de mutation vers un autre centre */
  request({ toCenterId, reason }) {
    return apiFetch('/center-transfer', { method: 'POST', body: JSON.stringify({ toCenterId, reason }) });
  },

  /** Annule ma demande en cours */
  cancel() {
    return apiFetch('/center-transfer', { method: 'DELETE' });
  },

  /** Administrateurs : les demandes qui arrivent dans leur centre (acceptables) ou en partent (lecture seule) */
  list() {
    return apiFetch('/center-transfer', { method: 'GET' });
  },

  /** Administrateur du centre d'arrivée : accepte la mutation de cet utilisateur */
  accept(userId) {
    return apiFetch(`/center-transfer/${userId}/accept`, { method: 'POST' });
  },
};
