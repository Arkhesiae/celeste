import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useCenterStore } from '@/stores/centerStore';
import { useTeamStore } from '@/stores/teamStore';
import { usePointStore } from '@/stores/pointStore';
import { useMessageStore } from '@/stores/messageStore';
import { useNotificationStore } from '@/stores/notificationStore';

export function useAppInitialization() {
  const authStore = useAuthStore();
  const userStore = useUserStore();
  const centerStore = useCenterStore();
  const teamStore = useTeamStore();
  const pointStore = usePointStore();
  const messageStore = useMessageStore();
  const notificationStore = useNotificationStore();

  const initializeApp = async () => {
    try {
      // 1. Charger les données d'authentification depuis le localStorage
      authStore.loadFromLocalStorage();

      if (authStore.isLoggedIn) {
        // 2. Charger les données de l'utilisateur courant
     

        // 3. Charger les données du centre si l'utilisateur en a un
        if (authStore.centerId) {
          await Promise.all([
            centerStore.fetchUsersByCenter(authStore.centerId),
            centerStore.fetchAdminsByCenter(),
            centerStore.fetchUsersCountByCenter()
          ]);
        }

        // 4. Charger les données de l'équipe de l'utilisateur
        if (authStore.userId) {
          await Promise.all([
            teamStore.fetchCurrentTeamOfUser(authStore.userId),
            teamStore.fetchTeamOccurrencesOfUser(authStore.userId)
          ]);
        }

        // 5. Charger les données personnelles de l'utilisateur
        await Promise.all([
          pointStore.fetchUserPoints(),
          messageStore.fetchMessages(),
          notificationStore.fetchNotifications(authStore.userId)
        ]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'application:', error);
      // En cas d'erreur, on déconnecte l'utilisateur pour éviter un état incohérent
      authStore.logOut();
    }
  };

  return {
    initializeApp
  };
} 