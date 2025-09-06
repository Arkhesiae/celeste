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

  if (to.path.startsWith('/.well-known/acme-challenge/')) {
    return next();
  }

  const authStore = useAuthStore();


  if (!authStore.accessToken) {
    console.log("No access token");
    try {
      await authStore.loadFromLocalStorage();
    } catch (error) {
      console.warn("⚠️ Erreur lors du chargement des données d'authentification:", error);
    }
  } else {
    console.log("Access token");
    try {
      await authStore.validateAccessToken();
    } catch (error) {
      
      console.warn("⚠️ Token invalide ou expiré", error);
    }
  }


  if (to.path === '/') {
    if (authStore.isLoggedIn) {
      return next({ path: '/dashboard' });
    } else {
      return next({ path: '/landing' });
    }
  }

  // Navigation guard pour les routes d'administration
 
  

  if (authStore.isLoggedIn) {
    if (authStore.userData.status === 'pending' && to.path !== '/pending-approval') {
      return next({ path: '/pending-approval' });
    }

    if ((noAuth.includes(to.name) && !both.includes(to.name))) {
      return next({ path: '/' });
    }

    if (to.path.startsWith('/admin') || to.path === '/admin-panel') {
      if (!authStore.userData.isAdmin) {
        return next({ path: '/' });
      }
    }
  }


  else {  
    console.log(to.name)
   if (to.path !== '/login' && !noAuth.includes(to.name) && !both.includes(to.name)) {
      return next({ path: '/login' });
    }
  } 

  console.log(to.path)
  next();



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
