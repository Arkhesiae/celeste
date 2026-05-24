// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/authStore.js';
import { useInitializationStore } from '@/stores/initializationStore';
import { setupLayouts } from 'virtual:generated-layouts'




const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(routes),
  scrollBehavior(to, from, savedPosition) {
    // Utiliser la position sauvegardée si elle existe
    if (savedPosition) {
      return savedPosition;
    }

    // Forcer le défilement vers le haut uniquement pour certaines routes
    const forceTopRoutes = [
      '/parameter',
      '/profile/[userId]/change-history',
      '/profile/[userId]/transaction-history',
      '/profile/[userId]/points'
    ];

    if (forceTopRoutes.includes(to.name)) {
      return { top: 0, behavior: 'smooth' };
    }

    // Comportement par défaut : défilement vers le haut
    return { top: 0 };
  }
});

const noAuth = ['/login', '/(account-creation)/creation', '/landing', '/(account-creation)/get-started', '/reset-password', '/(account-creation)/account-recovery']
const both = ['/contact-admin', '/loading']

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

router.beforeEach(async (to, from) => {
  if (to.path.startsWith('/.well-known/acme-challenge/')) {
    return;
  }

  const authStore = useAuthStore();
  const initializationStore = useInitializationStore();

  if (!authStore.isAuthReady) {
    console.log('==> Initialisation de l\'authentification')
    await authStore.initializeAuth();
  }

  if (to.path === '/') {
    if (authStore.isLoggedIn) {
      return "/dashboard";
    } else {
      return "/landing";
    }
  }

  if (authStore.isLoggedIn) {
    if (!initializationStore.isAppReady && to.path !== '/loading') {
      initializationStore.setPendingRoute(to.path);
      return "/loading";
    }

    if (authStore.userData.status === 'pending' && to.path !== '/pending-approval') {
      return "/pending-approval";
    }

    if (noAuth.includes(to.name) && !both.includes(to.name)) {
      return "/";
    }

    if (to.path.startsWith('/admin') || to.path === '/admin-panel') {
      if (!authStore.userData.isAdmin) {
        return "/";
      }
    }
  } else {
    if (to.path !== '/login' && !noAuth.includes(to.name) && !both.includes(to.name)) {
      return "/login";
    }
  }
});






if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      console.log('updated : count is now ', newModule.count)
    }
  })
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
