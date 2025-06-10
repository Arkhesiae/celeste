import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useCenterStore } from '@/stores/centerStore';
import { useTeamStore } from '@/stores/teamStore';
import { usePointStore } from '@/stores/pointStore';
import { useMessageStore } from '@/stores/messageStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useSubstitutionStore } from '@/stores/substitutionStore';
import { useRotationStore } from '@/stores/rotationStore';
import { useInitializationStore } from '@/stores/initializationStore';

export function useAppInitialization() {
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const centerStore = useCenterStore();
  const teamStore = useTeamStore();
  const pointStore = usePointStore();
  const messageStore = useMessageStore();
  const shiftStore = useShiftStore();
  const notificationStore = useNotificationStore();
  const substitutionStore = useSubstitutionStore();
  const rotationStore = useRotationStore();
  const initializationStore = useInitializationStore();

  const initializeAuth = async () => {
    authStore.loadFromLocalStorage();
    if (authStore.isLoggedIn) {
      await userStore.fetchCurrentUser();
    }
  };

  const initializeCenter = async (onProgress) => {
    if (!authStore.centerId) return;

    initializationStore.currentlyLoading = 'center';
    await Promise.all([
      centerStore.fetchUsersByCenter(authStore.centerId),
      centerStore.fetchAdminsByCenter(),
      centerStore.fetchUsersCountByCenter()
    ]);
    initializationStore.updateInitializationState('center', true);
    if (onProgress) onProgress('center');
  };

  const initializeTeam = async (onProgress) => {
    if (!authStore.userId) return;

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
    await substitutionStore.fetchAllDemands({
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });
    initializationStore.updateInitializationState('substitutions', true);
    if (onProgress) onProgress('substitutions');
  };

  const initializeRotations = async (onProgress) => {
    if (!authStore.centerId) return;

    initializationStore.currentlyLoading = 'rotations';
    await rotationStore.fetchRotations(authStore.centerId);
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

  const initializeApp = async (onProgress) => {
    try {
      initializationStore.setLoading(true);
      
      await initializeAuth();
      if (onProgress) onProgress('user');

      if (authStore.isLoggedIn) {
        await initializeCenter(onProgress);
        await initializeTeam(onProgress);
        await initializeShiftsAndSubstitutions(onProgress);
        await initializeRotations(onProgress);
        await initializePersonalData(onProgress);
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