// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/authStore.js';
import { setupLayouts } from 'virtual:generated-layouts'

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(routes),
  scrollBehavior (to, from, savedPosition) {
    if (to.name === '/parameter') {
      return { top: 0 }
    }
  }
});

const noAuth = ['/login', '/(account-creation)/creation', '/landing', '/(account-creation)/get-started']

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

// Garde de navigation globale
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  authStore.validateAccessToken();

  // Gestion des transitions pour les pages avec layout parameter
  if (to.meta.layout === 'parameter') {
    to.meta.transition = transitionConfigs.parameter.forward;
  } else if (from.meta.layout === 'parameter') {
    to.meta.transition = transitionConfigs.parameter.backward;
  }

  // Vérification de l'authentification
  if (!noAuth.includes(to.name) && !authStore.isLoggedIn) {
    return next({ name: '/login' });
  }
  
  if (noAuth.includes(to.name) && authStore.isLoggedIn) {
    return next({ name: '/dashboard' });
  }

  // Gestion des transitions pour les routes spécifiques
  const applyTransition = (config) => {
    const { routes, forward, backward } = config;
    if (routes.includes(to.name) && routes.includes(from.name)) {
      const toIndex = routes.indexOf(to.name);
      const fromIndex = routes.indexOf(from.name);
      to.meta.transition = toIndex > fromIndex ? forward : backward;
    }
   
  };

  applyTransition(transitionConfigs.auth);
  applyTransition(transitionConfigs.teams);

  next();
});

// Gestion des hot updates
if (import.meta.hot) {
  import.meta.hot.accept('./auto-routes.js', (mod) => {
    if (mod) {
      handleHotUpdate(mod.default);
    }
  });
}

// Gestion des erreurs de chargement dynamique
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    const hasReloaded = localStorage.getItem('vuetify:dynamic-reload');
    if (!hasReloaded) {
      console.log('Reloading page to fix dynamic import error');
      localStorage.setItem('vuetify:dynamic-reload', 'true');
      location.assign(to.fullPath);
    } else {
      console.error('Dynamic import error, reloading page did not fix it', err);
    }
  } else {
    console.error('Router error:', err);
  }
});

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload');
});

export default router;
