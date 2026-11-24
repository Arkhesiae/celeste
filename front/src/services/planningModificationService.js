import { apiFetch } from '../config/api';

export const planningModificationService = {
  async fetchEntries(userId, date) {
    const response = await apiFetch(`/calendar-entry/${userId}?date=${encodeURIComponent(date)}`, {
      method: 'GET',
    });
    return response;
  },

  async registerEntry(data) {
    const response = await apiFetch(`/calendar-entry/register-entry`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /** Note du jour (commentaire indépendant de la vacation et des entrées) ; un commentaire vide la supprime. Renvoie le jour recalculé. */
  async setDayComment(date, comment) {
    const response = await apiFetch(`/calendar-entry/comment`, {
      method: 'PUT',
      body: JSON.stringify({ date, comment }),
    });
    return response;
  },

  async deleteAssignment(userId, date) {
    console.log(userId, date);
    const response = await apiFetch(`/calendar-entry/delete-assignment`, {
      method: 'POST',
      body: JSON.stringify({ userId, date }),
    });
    return response;
  },

  async undoMods(userId, date) {
    const response = await apiFetch(`/calendar-entry/undo-mods`, {
      method: 'POST',
      body: JSON.stringify({ userId, date }),
    });
    return response;
  },
};
