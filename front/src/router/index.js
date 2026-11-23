// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from 'vue-router/auto-routes';
import { useAuthStore } from '@/stores/authStore.js';
import { useInitializationStore } from '@/stores/initializationStore';
import { setupLayouts } from 'virtual:generated-layouts';

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(routes),
});

// Anciennes adresses des pages réunies sous /information
router.addRoute({ path: '/financement', redirect: '/information/financement' });
router.addRoute({ path: '/patchnotes', redirect: '/information/patchnotes' });
// Anciennes adresses du calendrier et de la grille, réunis sous /planning (le centre de la grille passe en requête)
router.addRoute({ path: '/calendar', redirect: '/planning/calendar' });
router.addRoute({ path: '/admin/pending-users', redirect: '/users/candidatures' });
router.addRoute({
  path: '/center/:centerId/grid',
  redirect: (to) => ({ path: '/planning/grid', query: { ...to.query, center: to.params.centerId } }),
});

const noAuth = [
  '/login',
  '/(account-creation)/creation',
  '/landing',
  '/(account-creation)/get-started',
  '/reset-password',
  '/(account-creation)/account-recovery',
];
const both = ['/contact-admin', '/loading'];

// Configuration des transitions
// const transitionConfigs = {
//   parameter: {
//     forward: 'slide-lefty',
//     backward: 'slide-righty'
//   },
//   auth: {
//     routes: ['/login', '/(account-creation)/creation'],
//     forward: 'slide-left',
//     backward: 'slide-right'
//   },
//   teams: {
//     routes: ['/center/centers', '/center/[centerId]/teams'],
//     forward: 'slide-lefty',
//     backward: 'slide-righty'
//   }
// };

router.beforeEach(async (to) => {
  if (to.path.startsWith('/.well-known/acme-challenge/')) {
    return;
  }

  const authStore = useAuthStore();
  const initializationStore = useInitializationStore();

  if (!authStore.isAuthReady) {
    console.log("==> Initialisation de l'authentification");
    await authStore.initializeAuth();
  }

  if (to.path === '/') {
    if (authStore.isLoggedIn) {
      return '/dashboard';
    } else {
      return '/landing';
    }
  }

  if (authStore.isLoggedIn) {
    if (!initializationStore.isAppReady && to.path !== '/loading') {
      initializationStore.setPendingRoute(to.path);
      return '/loading';
    }

    if (authStore.userData.status === 'pending' && to.path !== '/pending-approval') {
      return '/pending-approval';
    }

    if (noAuth.includes(to.name) && !both.includes(to.name)) {
      return '/';
    }

    if (to.path.startsWith('/admin') || to.path === '/admin-panel' || to.path.startsWith('/users/')) {
      if (!authStore.userData.isAdmin) {
        return '/';
      }
    }
  } else {
    if (to.path !== '/login' && !noAuth.includes(to.name) && !both.includes(to.name)) {
      return '/login';
    }
  }
});

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      console.log('updated : count is now ', newModule.count);
    }
  });
}

// Gestion des erreurs de chargement dynamique
router.onError((err) => {
  console.log('==> Router error:', err);
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    const hasReloaded = localStorage.getItem('app:dynamic-reload');

    if (!hasReloaded) {
      console.warn('⚡ Dynamic import error, reloading...');
      localStorage.setItem('app:dynamic-reload', 'true');
      window.location.reload();
    } else {
      console.error('❌ Reload did not fix dynamic import error:', err);
    }
  } else {
    console.error('Router navigation error:', err);
  }
});

router.isReady().then(() => {
  localStorage.removeItem('app:dynamic-reload');
});

export default router;
