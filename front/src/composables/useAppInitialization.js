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
    await authStore.loadFromLocalStorage();
  };

  const initializeTheme = async () => {
    initializationStore.currentlyLoading = 'theme';
    if (authStore.isLoggedIn) {
      theme.global.name.value = authStore.preferences.theme ? 'darkTheme' : 'lightTheme';
    }
   
  };

  const initializeCenter = async (onProgress) => {
    initializationStore.currentlyLoading = 'center';
    centerStore.fetchCenters();
    if (!authStore.centerId) return;
  
    await Promise.all([
      userStore.fetchUsersByCenter(authStore.centerId),
      centerStore.fetchAdminsByCenter(),
      centerStore.fetchUsersCountByCenter()
    ]);
    initializationStore.updateInitializationState('center', true);
    if (onProgress) onProgress('center');
  };

  const initializeTeam = async (onProgress) => {
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
    if (onProgress) onProgress('team');
  };

  const initializeShiftsAndSubstitutions = async (onProgress) => {
    if (!authStore.userId) return;

    initializationStore.currentlyLoading = 'shifts';
    const dates = {
      startDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() - 1, 1)).toISOString(), // Premier jour du mois à 00:00 UTC
      endDate: new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 2, 0, 23, 59, 59, 999)).toISOString() // Dernier jour du mois à 23:59:59.999 UTC
    }
    await shiftStore.fetchShiftsWithSubstitutions(dates);
    initializationStore.updateInitializationState('shifts', true);
    if (onProgress) onProgress('shifts');

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
    if (onProgress) onProgress('substitutions');
  };

  const initializeRotations = async (onProgress) => {
    if (!authStore.centerId) return;

    initializationStore.currentlyLoading = 'rotations';
    await rotationStore.fetchRotations(authStore.centerId);
    await centerStore.fetchActiveRotationOfCenter(authStore.centerId);
    initializationStore.updateInitializationState('rotations', true);
    if (onProgress) onProgress('rotations');
  };

  const initializePersonalData = async (onProgress) => {
    initializationStore.currentlyLoading = 'personal';
    await Promise.all([
      pointStore.fetchUserPoints(),
      pointStore.fetchTransactions(),
      notificationStore.fetchNotifications(authStore.userId)
    ]);
    initializationStore.updateInitializationState('personal', true);
    if (onProgress) onProgress('personal');
  };

  const initializeTickets = async (onProgress) => {
    if (!authStore.isAdmin) return;

    initializationStore.currentlyLoading = 'tickets';
    await ticketStore.fetchTickets();
    initializationStore.updateInitializationState('tickets', true);
    if (onProgress) onProgress('tickets');
  };

  
  const initializeRules = async (onProgress) => {
    if (!authStore.isAdmin) return;

    initializationStore.currentlyLoading = 'rules';
    await ruleStore.fetchRules();
    initializationStore.updateInitializationState('rules', true);
    if (onProgress) onProgress('rules');
  };

  const initializeApp = async (onProgress) => {
    try {
      initializationStore.setLoading(true);
      console.log("initializeApp");
      await initializeAuth();
      await initializeTheme();
      await initializeCenter(onProgress);
      if (authStore.isLoggedIn) {
        await initializeTeam(onProgress);
        await initializeShiftsAndSubstitutions(onProgress);
        await initializeRotations(onProgress);
        await initializePersonalData(onProgress);
        await initializeTickets(onProgress);
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