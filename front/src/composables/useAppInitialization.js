import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useCenterStore } from '@/stores/centerStore';
import { useTeamStore } from '@/stores/teamStore';
import { usePointStore } from '@/stores/pointStore';
import { useMessageStore } from '@/stores/messageStore';
import { useNotificationStore } from '@/stores/notificationStore';
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
  const notificationStore = useNotificationStore();
  const substitutionStore = useSubstitutionStore();
  const rotationStore = useRotationStore();
  const initializationStore = useInitializationStore();

  const initializeApp = async (onProgress) => {
    try {
      authStore.loadFromLocalStorage();
      initializationStore.setLoading(true);
      
      if (authStore.isLoggedIn) {
        await userStore.fetchCurrentUser();
        if (onProgress) onProgress('user');

        if (authStore.centerId) {
          initializationStore.currentlyLoading = 'center';
          await Promise.all([
            centerStore.fetchUsersByCenter(authStore.centerId),
            centerStore.fetchAdminsByCenter(),
            centerStore.fetchUsersCountByCenter()
          ]);
          initializationStore.updateInitializationState('center', true);
          if (onProgress) onProgress('center');
        }

        if (authStore.userId) {
          initializationStore.currentlyLoading = 'team';
          await Promise.all([
            teamStore.fetchCurrentTeamOfUser(authStore.userId),
            teamStore.fetchTeamOccurrencesOfUser(authStore.userId),
            teamStore.fetchCenterTeams(authStore.centerId)
          ]);
          initializationStore.updateInitializationState('team', true);
          if (onProgress) onProgress('team');
        }

        initializationStore.currentlyLoading = 'substitutions';
        await substitutionStore.fetchAllDemands({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });
        initializationStore.updateInitializationState('substitutions', true);
        if (onProgress) onProgress('substitutions');

        if (authStore.centerId) {
          initializationStore.currentlyLoading = 'rotations';
          await rotationStore.fetchRotations(authStore.centerId);
          initializationStore.updateInitializationState('rotations', true);
          if (onProgress) onProgress('rotations');
        }

        initializationStore.currentlyLoading = 'personal';
        await Promise.all([
          pointStore.fetchUserPoints(),
     
          notificationStore.fetchNotifications(authStore.userId)
        ]);
        initializationStore.updateInitializationState('personal', true);
        if (onProgress) onProgress('personal');
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