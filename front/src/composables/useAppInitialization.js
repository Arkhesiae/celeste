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
    initializationStore.currentlyLoading = 'theme';
    if (authStore.isLoggedIn) {
      theme.global.name.value = authStore.preferences.theme ? 'darkTheme' : 'lightTheme';
    }
   
  };

  const initializeCenter = async () => {
    initializationStore.currentlyLoading = 'center';
    centerStore.fetchCenters();
    if (!authStore.centerId) return;
  
    await Promise.all([
      userStore.fetchUsersByCenter(authStore.centerId),
      centerStore.fetchAdminsByCenter(),
      centerStore.fetchUsersCountByCenter()
    ]);
    initializationStore.updateInitializationState('center', true);
  };

  const initializeTeam = async () => {
    if (!authStore.userId) return;
    if (authStore.isAdmin && authStore.adminType === 'master') {
      await teamStore.fetchAllTeams();
    } 
    initializationStore.currentlyLoading = 'team';
    await Promise.all([
      teamStore.fetchCurrentTeamOfUser(authStore.userId),
      teamStore.fetchTeamOccurrencesOfUser(authStore.userId),
      teamStore.fetchCenterTeams(authStore.centerId)
    ]);
    initializationStore.updateInitializationState('team', true);
  };

  const initializeShiftsAndSubstitutions = async () => {
    if (!authStore.userId) return;

    initializationStore.currentlyLoading = 'shifts';
    const dates = {
      startDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() - 1, 1)).toISOString(), // Premier jour du mois à 00:00 UTC
      endDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 2, 0, 23, 59, 59, 999)).toISOString() // Dernier jour du mois à 23:59:59.999 UTC
    }
    await shiftStore.fetchShiftsWithSubstitutions(dates);
    initializationStore.updateInitializationState('shifts', true);

    initializationStore.currentlyLoading = 'substitutions';
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
    if (!authStore.centerId) return;

    initializationStore.currentlyLoading = 'rotations';
    await rotationStore.fetchRotations(authStore.centerId);
    await centerStore.fetchActiveRotationOfCenter(authStore.centerId);
    initializationStore.updateInitializationState('rotations', true);
  };

  const initializePersonalData = async () => {
    initializationStore.currentlyLoading = 'personal';
    await Promise.all([
      pointStore.fetchUserPoints(),
      pointStore.fetchTransactions(),
      notificationStore.fetchNotifications(authStore.userId)
    ]);
    initializationStore.updateInitializationState('personal', true);
  };

  const initializeTickets = async () => {
    if (!authStore.isAdmin) return;

    initializationStore.currentlyLoading = 'tickets';
    await ticketStore.fetchTickets();
    initializationStore.updateInitializationState('tickets', true);
  };



  const initializeApp = async () => {
    try {
      initializationStore.setLoading(true);
  
      await initializeAuth();
      await initializeTheme();
      await initializeCenter();
      if (authStore.isLoggedIn) {
        await initializeTeam();
        await initializeShiftsAndSubstitutions();
        await initializeRotations();
        await initializePersonalData();
        await initializeTickets();
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'application:', error);
      authStore.logOut();
      throw error;
    } finally {
      initializationStore.setLoading(false);
    }
  };

  return {
    initializeApp,
    initializationState: initializationStore.initializationState,
    isLoading: initializationStore.isLoading
  };
} 