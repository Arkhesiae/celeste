// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/authStore.js';
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
const both = ['/contact-admin']

// Configuration des transitions
const transitionConfigs = {
  parameter: {
    forward: 'slide-lefty',
    backward: 'slide-righty'
  },
  auth: {
    routes: ['/login', '/(account-creation)/creation'],
    forward: 'slide-left',
    backward: 'slide-right'
  },
  teams: {
    routes: ['/center/centers', '/center/[centerId]/teams'],
    forward: 'slide-lefty',
    backward: 'slide-righty'
  }
};
router.beforeEach(async (to, from, next) => {
  // 🔒 Bypass pour Let's Encrypt (ACME challenge)
  if (to.path.startsWith('/.well-known/acme-challenge/')) {
    return next();
  }

  // 🎬 Gestion des transitions
  const applyTransitions = (to, from) => {
    // Layout "parameter"
    if (to.meta.layout === 'parameter') {
      to.meta.transition = transitionConfigs.parameter.forward;
    } else if (from.meta.layout === 'parameter') {
      to.meta.transition = transitionConfigs.parameter.backward;
    }

    // Configs personnalisées
    const applyTransitionConfig = (config) => {
      const { routes, forward, backward } = config;
      if (routes.includes(to.name) && routes.includes(from.name)) {
        const toIndex = routes.indexOf(to.name);
        const fromIndex = routes.indexOf(from.name);
        to.meta.transition = toIndex > fromIndex ? forward : backward;
      }
    };

    applyTransitionConfig(transitionConfigs.auth);
    applyTransitionConfig(transitionConfigs.teams);
  };

  applyTransitions(to, from);



  // 👤 Authentification
  const authStore = useAuthStore();

  try {
    await authStore.validateAccessToken();
  } catch (error) {
    console.warn("⚠️ Token invalide ou expiré", error);
    
  }

 
  if (authStore.isLoggedIn) {
    if (authStore.status === 'pending' && to.name !== '/pending-approval') {
      return next({ name: '/pending-approval' });
    }

    if (to.name === '/') {
      return next({ name: '/dashboard' });
    }

    if (noAuth.includes(to.name) && !both.includes(to.name)) {
      return next({ name: '/dashboard' });
    }

    return next();
  }

  if (to.name === '/') {
    return next({ name: '/landing' });
  }

  if (to.name !== '/login' && !noAuth.includes(to.name) && !both.includes(to.name)) {
    return next({ name: '/login' });
  }

  return next();
});




if (import.meta.hot) {
  import.meta.hot.accept('./auto-routes.js', (mod) => {
    if (mod?.default) {
      console.log('♻️ Hot update des routes détecté');
      handleHotUpdate(mod.default);
    } else {
      console.warn('⚠️ Hot update: module auto-routes vide ou invalide');
    }
  });
}

// Gestion des erreurs de chargement dynamique
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    const hasReloaded = localStorage.getItem('vuetify:dynamic-reload');

    if (!hasReloaded) {
      console.warn('⚡ Dynamic import error, forcing reload');
      localStorage.setItem('vuetify:dynamic-reload', 'true');
      window.location.reload(); // Hard reload
    } else {
      console.error('❌ Reload did not fix dynamic import error:', err);
    }
  } else {
    console.error('Router navigation error:', err);
  }
});

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload');
});

export default router;
