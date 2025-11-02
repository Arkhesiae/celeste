import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useCenterStore } from '@/stores/centerStore';
import { useTeamStore } from '@/stores/teamStore';
import { usePointStore } from '@/stores/pointStore';
import { useTicketStore } from '@/stores/ticketStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useInitializationStore } from '@/stores/initializationStore';
import { useTheme } from 'vuetify';


export function useAppInitialization() {
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const centerStore = useCenterStore();
  const teamStore = useTeamStore();
  const pointStore = usePointStore();
  const ticketStore = useTicketStore();
  const shiftStore = useShiftStore();
  const notificationStore = useNotificationStore();
  const substitutionStore = useSubstitutionStore();
  const rotationStore = useRotationStore();
  const initializationStore = useInitializationStore();
  const theme = useTheme();


  const initializeAuth = async () => {
    // Ne charger que si pas déjà chargé (éviter les appels redondants)
    if (!authStore.accessToken) {
      await authStore.loadFromLocalStorage();
    } else {
      await authStore.validateAccessToken();
    }

  };

  const initializeTheme = async () => {
    if (authStore.isLoggedIn) {
      if (authStore.userData.preferences.theme === 'darkTheme') {
        theme.change('darkTheme');
      } else {
        theme.change('lightTheme');
      }
 
    }
   
  };

  const initializeCenters = async () => {
    await centerStore.fetchCenters();
    initializationStore.updateInitializationState('centers', true);
  };

  const initializeUserList = async () => {
    if (authStore.userData.isAdmin && authStore.userData.adminType === 'master') {
      await userStore.fetchUsers();
    } else {
      await userStore.fetchUsersByCenter(authStore.userData.centerId);
    }
    initializationStore.updateInitializationState('users', true);
  };

  const initializeTeam = async () => {
    if (!authStore.userData.userId) return;
    if (authStore.userData.isAdmin && authStore.userData.adminType === 'master') {
      await teamStore.fetchAllTeams();
    } 
    await Promise.all([
      teamStore.fetchCurrentTeamOfUser(authStore.userData.userId),
      teamStore.fetchTeamOccurrencesOfUser(authStore.userData.userId),
      teamStore.fetchCenterTeams(authStore.userData.centerId)
    ]);
    initializationStore.updateInitializationState('team', true);
  };

  const initializeShiftsAndSubstitutions = async () => {
    if (!authStore.userData.userId) return;

    const dates = {
      startDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() - 1, 1)).toISOString(), // Premier jour du mois à 00:00 UTC
      endDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 2, 0, 23, 59, 59, 999)).toISOString() // Dernier jour du mois à 23:59:59.999 UTC
    }
    await shiftStore.fetchShiftsWithSubstitutions(dates);
    initializationStore.updateInitializationState('shifts', true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
 
      substitutionStore.fetchAllDemands({
        startDate: today.toISOString(),
        endDate: oneYearFromNow.toISOString()
      })
    
    initializationStore.updateInitializationState('substitutions', true);
  };

  const initializeRotations = async () => {
    if (!authStore.userData.centerId) return;

    await rotationStore.fetchRotations(authStore.userData.centerId);
    await centerStore.fetchActiveRotationOfCenter(authStore.userData.centerId);
    initializationStore.updateInitializationState('rotations', true);
  };

  const initializePersonalData = async () => {
    await Promise.all([
      pointStore.fetchUserPoints(),
      pointStore.fetchTransactions(),
    ]);

    try {
      await notificationStore.fetchNotifications(authStore.userData.userId);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    }

    initializationStore.updateInitializationState('personal', true);
  };

  const initializeTickets = async () => {
    if (!authStore.userData.isAdmin) return;

    await ticketStore.fetchTickets();
    initializationStore.updateInitializationState('tickets', true);
  };



  const initializeApp = async () => {
    try {
      initializationStore.setLoading(true);
  
      
      await initializeAuth();

      const parallelTasks = [
        initializeTheme(),
        initializeCenters(),
      ];

      if (authStore.isLoggedIn) {
        parallelTasks.push(
          initializeUserList(),
          initializeTeam(),
          initializeShiftsAndSubstitutions(),
          initializeRotations(),
          initializePersonalData(),
          initializeTickets()
        );
      }

      await Promise.all(parallelTasks);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'application:', error);
      authStore.logOut();
      throw error;
    } finally {
      setTimeout(() => {
        initializationStore.setLoading(false);
      }, 1000);
    }
  };

  return {
    initializeApp,
    initializationState: initializationStore.initializationState,
    isLoading: initializationStore.isLoading
  };
} 