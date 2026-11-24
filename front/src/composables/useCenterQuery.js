import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore.js';

// Le centre demandé par `?center=` (le lien de la page d'un centre, pour les utilisateurs et les tours de service) : seul un administrateur
// principal peut en désigner un autre que le sien, les autres gardent leur centre (la valeur est `undefined`).
export function useCenterQuery() {
  const route = useRoute();
  const authStore = useAuthStore();

  return computed(() => (authStore.userData.adminType === 'master' ? route.query.center || undefined : undefined));
}
