import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
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


  // Actions
  /**
   * Récupère toutes les équipes d'un centre spécifique.
   * @param {string} centerId - L'ID du centre.
   */
  const fetchCenterTeams = async (centerId) => {
    try {
      loading.value = true;
      error.value = null;
      centerTeams.value = await teamService.getTeams(centerId);
      currentCenter.value = centerId;
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
      teams.value = await teamService.getTeams();
    } catch (err) {
      error.value = err.message || 'Erreur lors de la récupération des équipes';
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
      throw err;
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
   * Attribue un utilisateur à une équipe.
   * @param {string} userId - L'ID de l'utilisateur.
   * @param {Object} teamData - Les données de la nouvelle équipe.
   */
  const assignUserToTeam = async (userId, teamData) => {
    try {
      loading.value = true;
      error.value = null;
      await teamService.addTeamMember(teamData.id, userId);
      await fetchCenterTeams(currentCenter.value);
    } catch (err) {
      error.value = err.message || 'Erreur lors de l\'attribution de l\'utilisateur à l\'équipe';
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
  const updateTeamName = async (teamId, teamName) => {
    try {
      loading.value = true;
      error.value = null;
      await teamService.updateTeam(teamId, { name: teamName });
      await fetchCenterTeams(currentCenter.value);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour du nom de l\'équipe';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Met à jour la date de début de cycle d'une équipe.
   * @param {string} teamId - L'ID de l'équipe.
   * @param {Date} cycleStartDate - La nouvelle date de début de cycle.
   */
  const updateTeamCycleStartDate = async (teamId, cycleStartDate) => {
    try {
      loading.value = true;
      error.value = null;
      await teamService.updateTeam(teamId, { cycleStartDate });
      await fetchCenterTeams(currentCenter.value);
    } catch (err) {
      error.value = err.message || 'Erreur lors de la mise à jour de la date de début de cycle';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    currentCenter,
    teams,
    centerTeams,
    currentTeam,
    teamOccurrences,
    loading,
    error,
   
    // Actions
    fetchCenterTeams,
    fetchAllTeams,
    fetchUsersByTeamIds,
    fetchCurrentTeamOfUser,
    fetchTeamOccurrencesOfUser,
    assignUserToTeam,
    addTeam,
    deleteTeam,
    updateTeamName,
    updateTeamCycleStartDate
  };
});


// updated code to review

// import { defineStore } from 'pinia';
// import { ref } from 'vue';
//
// export const useTeamStore = defineStore('team', () => {
//   const teams = ref([]);  // List of all teams (for reference)
//   const centerTeams = ref({});  // Object to store teams by centerId
//
//   // Fetch teams for a specific center and store them in the centerTeams object
//   const fetchCenterTeams = async (centerId) => {
//     if (centerTeams.value[centerId]) {
//       // Return the cached teams for the center if already fetched
//       return centerTeams.value[centerId];
//     }
//
//     try {
//       const response = await fetch(`http://192.168.1.36:3000/teams/${centerId}`);
//       const data = await response.json();
//       centerTeams.value[centerId] = data;  // Store the teams in the dictionary
//       return data;
//     } catch (error) {
//       console.error('Error fetching teams for the center:', error);
//     }
//   };
//
//   // Add a new team to a specific center
//   const addTeam = async (centerId, teamName) => {
//     try {
//       const response = await fetch('http://192.168.1.36:3000/teams/create-team', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ centerId, name: teamName }),
//       });
//       const newTeam = await response.json();
//       if (!centerTeams.value[centerId]) {
//         centerTeams.value[centerId] = [];  // If no teams exist for the center, initialize the array
//       }
//       centerTeams.value[centerId].push(newTeam);  // Add the new team to the center's list
//     } catch (error) {
//       console.error('Error adding team:', error);
//     }
//   };
//
//   // Delete a team from a specific center
//   const deleteTeam = async (centerId, teamId) => {
//     try {
//       const response = await fetch(`http://192.168.1.36:3000/teams/delete-team/${teamId}`, { method: 'DELETE' });
//       if (!response.ok) throw new Error('Failed to delete team');
//
//       centerTeams.value[centerId] = centerTeams.value[centerId].filter((team) => team._id !== teamId);  // Remove the team from the list
//     } catch (error) {
//       console.error('Error deleting team:', error);
//     }
//   };
//
//   return {
//     teams,
//     centerTeams,
//     fetchCenterTeams,
//     addTeam,
//     deleteTeam,
//   };
// });
