import { Temporal } from '@js-temporal/polyfill';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useCenterStore } from '@/stores/centerStore';
import { useTeamStore } from '@/stores/teamStore';
import { usePointStore } from '@/stores/pointStore';
import { useTicketStore } from '@/stores/ticketStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useInitializationStore } from '@/stores/initializationStore';
import { useTheme } from 'vuetify';



export function useAppInitialization() {
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const centerStore = useCenterStore();
  const theme = useTheme();
  const teamStore = useTeamStore();
  const pointStore = usePointStore();
  const ticketStore = useTicketStore();
  const shiftStore = useShiftStore();
  const substitutionStore = useSubstitutionStore();
  const rotationStore = useRotationStore();
  const initializationStore = useInitializationStore();


  const initializeAuth = async () => {
    if (authStore.isAuthReady) return;
    await authStore.initializeAuth();
  };

  const initializeTheme = async () => {
    if (authStore.isLoggedIn) {
      if (authStore.userData.preferences.theme) {
        theme.change('darkTheme');
      } else {
        theme.change('lightTheme');
      }
    }
  };

  const initializeCenters = async () => {
    await centerStore.fetchCenters();
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
    const { userId, centerId, isAdmin, adminType } = authStore.userData;

    if (!userId) {
      return;
    }

    if (isAdmin && adminType === 'master') {
      await teamStore.fetchAllTeams();
    }

    await Promise.all([
      teamStore.fetchCurrentTeamOfUser(userId),
      teamStore.fetchTeamOccurrencesOfUser(userId),
      teamStore.fetchCenterTeams(centerId)
    ]);

    initializationStore.updateInitializationState('team', true);
  };

  const initializeShiftsAndSubstitutions = async () => {
    if (!authStore.userData.userId) return;

    // Jours (YYYY-MM-DD) : du 1er du mois précédent au dernier jour du mois suivant
    const today = Temporal.Now.plainDateISO();
    const nextMonth = Temporal.PlainYearMonth.from(today).add({ months: 1 });
    const dates = {
      startDate: today.subtract({ months: 1 }).with({ day: 1 }).toString(),
      endDate: nextMonth.toPlainDate({ day: nextMonth.daysInMonth }).toString()
    }
    await shiftStore.fetchShiftsWithSubstitutions(dates);
    initializationStore.updateInitializationState('shifts', true);

    await substitutionStore.fetchAllDemands({
      startDate: today.toString(),
      endDate: today.add({ years: 1 }).toString()
    });

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
      const parallelTasks = [];


      if (authStore.isLoggedIn) {
        parallelTasks.push(
          initializeTheme(),
          initializeUserList(),
          initializeTeam(),
          initializeShiftsAndSubstitutions(),
          initializeRotations(),
          initializePersonalData(),
          initializeTickets()
        );
      }

      await Promise.all(parallelTasks);
      initializationStore.setAppReady(true);

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de l\'application :', error);
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
    initializeCenters,
    initializationState: initializationStore.initializationState,
    isLoading: initializationStore.isLoading
  };
} 