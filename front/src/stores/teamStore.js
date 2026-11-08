import { defineStore } from 'pinia';

import { teamService } from '@/services/teamService';
import { userService } from '@/services/userService';

/**
 * Store Pinia pour gérer l'état des équipes.
 * @module teamStore
 */
export const useTeamStore = defineStore('team', () => {
  // State
  const currentCenter = ref('');
  const teams = ref([]);
  const centerTeams = ref([]);
  const loading = ref(false);
  const error = ref(null);
  // User related
  const currentTeam = ref(null);
  const teamOccurrences = ref([]);
  const userTeamTimeline = ref(null); // { window, teams: [{ teamId, teamName, segments }] }


  // Actions
  /**
   * Récupère toutes les équipes d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   * @param {Object} [options]
   * @param {boolean} [options.publicList=false] - Liste publique (id et nom) pour l'inscription, sans connexion.
   */
  const fetchCenterTeams = async (centerId, { publicList = false } = {}) => {
    if (!centerId) {
      console.warn('[teamStore] fetchCenterTeams skipped: missing centerId');
      return [];
    }

    try {
      loading.value = true;
      error.value = null;
      centerTeams.value = await teamService.getTeams(centerId, { publicList });
      currentCenter.value = centerId;
      return centerTeams.value
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des équipes du centre';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère toutes les équipes.
   */
  const fetchAllTeams = async () => {
    try {
      loading.value = true;
      error.value = null;
      teams.value = await teamService.getAllTeams();
      return teams.value
    } catch (err) {
      console.error('Erreur lors de la récupération des équipes:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les utilisateurs par IDs d'équipe.
   * @param {Array<string>|string} teamIds - Les IDs des équipes.
   * @param {string} date - La date pour filtrer les utilisateurs.
   * @returns {Promise<Array>} Liste des utilisateurs.
   */
  const fetchUsersByTeamIds = async (teamIds, date) => {
    try {
      loading.value = true;
      error.value = null;
      return await teamService.getTeamMembers(teamIds, date);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des utilisateurs';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère l'équipe actuelle d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  const fetchCurrentTeamOfUser = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      currentTeam.value = await userService.fetchCurrentTeamOfUser(userId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération de l\'équipe actuelle';

    } finally {
      loading.value = false;
    }
  };

  /**
   * Récupère les occurrences d'équipe d'un utilisateur.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  const fetchTeamOccurrencesOfUser = async (userId) => {
    try {
      loading.value = true;
      error.value = null;
      teamOccurrences.value = await userService.fetchTeamOccurrencesOfUser(userId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des occurrences d\'équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Charge la frise des équipes d'un utilisateur. Non bloquant : une erreur laisse simplement la frise vide.
   * @param {string} userId - L'ID de l'utilisateur.
   */
  const fetchUserTeamTimeline = async (userId) => {
    try {
      userTeamTimeline.value = await userService.fetchUserTeamTimeline(userId);
    } catch (err) {
      userTeamTimeline.value = null;
      console.error('Erreur lors de la récupération de la frise des équipes :', err);
    }
  };

  /**
   * Attribue un utilisateur à une équipe.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {Object} teamData - Les données de la nouvelle équipe.
   */
  const assignUserToTeam = async (userId, teamData) => {
    try {
      loading.value = true;
      error.value = null;
      // teamData peut contenir `confirmed` et `replaceOccurrenceId` ; 409 → { needsApproval: true, ... }
      const result = await teamService.assignToTeam(userId, teamData);
      if (result?.needsApproval) return result;
      await fetchTeamOccurrencesOfUser(userId);
      await fetchCurrentTeamOfUser(userId);
      return result;
      // Fetch substitutions and vacations ?
    } catch (err) {
      error.value = err.message || 'Erreur lors de l\'attribution de l\'utilisateur à l\'équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };


  const deleteTeamOccurrence = async (userId, occurrenceId, confirmed = false) => {
    try {
      loading.value = true;
      error.value = null;
      const result = await teamService.deleteTeamOccurrence(userId, occurrenceId, confirmed);
      if (result?.needsApproval) return result;
      await fetchTeamOccurrencesOfUser(userId);
      await fetchCurrentTeamOfUser(userId);
      return result;
      // Fetch substitutions and vacations ?
    } catch (err) {
      console.error('Erreur détaillée:', err);
      error.value = err.message || 'Erreur lors de la suppression de l\'occurrence d\'équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Ajoute une nouvelle équipe à un centre.
   * @param {string} centerId - L'ID du centre.
   * @param {string} teamName - Le nom de la nouvelle équipe.
   */
  const addTeam = async (centerId, teamName) => {
    try {
      loading.value = true;
      error.value = null;
      await teamService.createTeam({ centerId, name: teamName });
      await fetchCenterTeams(centerId);
    } catch (err) {
      error.value = err.message || 'Erreur lors de l\'ajout de l\'équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Supprime une équipe.
   * @param {string} teamId - L'ID de l'équipe à supprimer.
   */
  const deleteTeam = async (teamId) => {
    try {
      loading.value = true;
      error.value = null;
      await teamService.deleteTeam(teamId);
      await fetchCenterTeams(currentCenter.value);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la suppression de l\'équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour le nom d'une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @param {string} teamName - Le nouveau nom de l'équipe.
   */
  const renameTeam = async (teamId, teamName) => {
    try {
      loading.value = true;
      error.value = null;
      await teamService.renameTeam(teamId, { name: teamName });
      await fetchCenterTeams(currentCenter.value);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour du nom de l\'équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Place une équipe à un jour du tour de service (voir teamService.updateTeamCyclePosition).
   * @param {string} teamId
   * @param {{ day: number, date: string, swap?: boolean }} position
   */
  const updateTeamCyclePosition = async (teamId, position) => {
    try {
      loading.value = true;
      error.value = null;
      const result = await teamService.updateTeamCyclePosition(teamId, position);
      await fetchCenterTeams(currentCenter.value);
      return result;
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour de la position dans le cycle';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour l'ordre des équipes.
   * @param {Array<string>} teamIds - Liste ordonnée des IDs des équipes.
   */
  const updateTeamsOrder = async (teamIds) => {
    try {
      loading.value = true;
      error.value = null;
      await teamService.updateTeamsOrder(teamIds);
      await fetchCenterTeams(currentCenter.value);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour de l\'ordre des équipes';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const emptyStore = () => {
    currentCenter.value = '';
    teams.value = [];
    centerTeams.value = [];
    currentTeam.value = null;
    teamOccurrences.value = [];
    loading.value = false;
    error.value = null;
  };

  /** Grille d'une équipe sur une courte période (non conservée dans le store : lecture à la demande). */
  const fetchTeamGrid = (teamId, startDate, endDate) => teamService.getTeamGrid(teamId, startDate, endDate);

  return {
    // State
    currentCenter,
    teams,
    centerTeams,
    currentTeam,
    teamOccurrences,
    userTeamTimeline,
    loading,
    error,

    // Actions
    fetchCenterTeams,
    fetchAllTeams,
    fetchUsersByTeamIds,
    fetchCurrentTeamOfUser,
    fetchTeamOccurrencesOfUser,
    fetchUserTeamTimeline,
    assignUserToTeam,
    addTeam,
    deleteTeam,
    renameTeam,
    updateTeamCyclePosition,
    updateTeamsOrder,
    fetchTeamGrid,
    deleteTeamOccurrence,
    emptyStore,
  };
});

