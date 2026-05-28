import { apiFetch } from '../config/api';

export const planningModificationService = {
  // async registerModification(modificationData) {
  //   const response = await apiFetch(`/planning-modifications/register`, {
  //     method: 'POST',
  //     body: JSON.stringify(modificationData)
  //   });
  //   return response;
  // },

  async restoreInitialShift(userId, date) {
    const response = await apiFetch(`/planning-modifications/restore-initial`, {
      method: 'POST',
      body: JSON.stringify({ userId, date })
    });
    return response;
  },

  async fetchEntries(userId, date) {
    const response = await apiFetch(`/planning-modifications/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ date })
    });
    return response;
  },

  async registerEntry(data) {
    const response = await apiFetch(`/planning-modifications/register-entry`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response;
  },

  async registerModification(data) {
    const response = await apiFetch(`/planning-modifications/register-modification`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return response;
  },


  async deleteAssignment(userId, date) {
    console.log(userId, date);
    const response = await apiFetch(`/planning-modifications/delete-assignment`, {
      method: 'POST',
      body: JSON.stringify({ userId, date })
    });
    return response;
  },

  async undoMods(userId, date) {
    const response = await apiFetch(`/planning-modifications/undo-mods`, {
      method: 'POST',
      body: JSON.stringify({ userId, date })
    });
    return response;
  },
}