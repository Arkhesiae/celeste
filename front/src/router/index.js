// router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from 'vue-router/auto-routes';
import { useAuthStore } from '@/stores/authStore.js';
import { useInitializationStore } from '@/stores/initializationStore';
import { setupLayouts } from 'virtual:generated-layouts';
import { trackNavigation } from './tabMemory.js';
import { parametersPath } from '@/utils/profilePaths.js';

const isPublicRoute = (route) => route.matched.some((record) => record.meta.public);
const requiresAdmin = (route) => route.matched.some((record) => record.meta.requiresAdmin);

// Un enfant prend le layout de son parent, sauf s'il en nomme un autre (`definePage({ meta: { layout } })`). Le plugin de layouts n'écrase pas :
// il emboîte (le layout du parent autour de celui de l'enfant). On le fait donc ici : quand un parent a un layout (le sien, ou hérité de plus
// haut) et qu'un descendant en nomme un autre, le parent n'est pas enveloppé et chacun de ses enfants l'est par le sien, le layout du parent
// pour ceux qui n'en nomment pas. Sinon (aucun descendant ne nomme un autre layout) le parent est enveloppé une fois, pour tous ses enfants.
// Un dossier sans page crée un parent sans nom au-dessus d'une racine (`profile/` au-dessus de `profile/[userId].vue`) : il est traversé.
const namesAnotherLayout = (route, layout) =>
  (route.children ?? []).some(
    (child) => (child.meta?.layout && child.meta.layout !== layout) || namesAnotherLayout(child, layout),
  );

const inheritLayouts = (list, inherited = null) =>
  list.map((route) => {
    console.log(route)
    const layout = route.meta?.layout ?? inherited;
    if (!route.children?.length)
      return !route.meta?.layout && layout ? { ...route, meta: { ...route.meta, layout } } : route;

    // Le parent est une simple traversée : ses enfants reçoivent le layout, lui n'en a pas. Il n'a pas de composant non plus : sa page racine
    // ne fait que porter les réglages de la section (`definePage`) et afficher ses enfants, et un composant entre le routeur de l'application et
    // les layouts changerait la forme de l'arbre d'une section à l'autre (`center > layout` face à `layout` seul) : Vue démonte alors tout le
    // layout (barre, tiroirs, barre du bas) en passant de l'une à l'autre. Une route sans composant n'ajoute pas de niveau de `<router-view>`.
    if (layout && namesAnotherLayout(route, layout)) {
      const sectionRoot = { ...route };
      delete sectionRoot.component;
      delete sectionRoot.components;
      return {
        ...sectionRoot,
        meta: { ...route.meta, layout: undefined },
        children: inheritLayouts(route.children, layout),
      };
    }
    // Sans layout hérité, rien à pousser : on traverse seulement (un parent sans nom au-dessus d'une racine)
    if (!layout) return { ...route, children: inheritLayouts(route.children, null) };
    // Enveloppé ici, une fois, pour tous ses descendants
    return { ...route, meta: { ...route.meta, layout }, children: route.children };
  });

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(inheritLayouts(routes)),
});

// Les piles de navigation des onglets (une navigation qui n'a pas eu lieu ne compte pas). La gestion de l'historique du navigateur est
// désactivée : `router/historyHandling.js`.
router.afterEach((to, _from, failure) => {
  if (!failure) trackNavigation(to);
});

// Anciennes adresses des pages réunies sous /information
router.addRoute({ path: '/financement', redirect: '/information/financement' });
router.addRoute({ path: '/patchnotes', redirect: '/information/patchnotes' });
// Anciennes adresses du calendrier et de la grille, réunis sous /planning (le centre de la grille passe en requête)
router.addRoute({ path: '/calendar', redirect: '/planning/calendar' });
router.addRoute({ path: '/admin/pending-users', redirect: '/center/users/candidatures' });
// Les utilisateurs et les tours de service sont des pages du centre
router.addRoute({ path: '/users', redirect: '/center/users' });
router.addRoute({ path: '/users/candidatures', redirect: '/center/users/candidatures' });
router.addRoute({ path: '/users/mutations', redirect: '/center/users/mutations' });
router.addRoute({ path: '/rotation', redirect: '/center/rotations' });
// L'assistance est une fenêtre, les paramètres une sous-page du profil
router.addRoute({ path: '/contact-admin', redirect: '/' });
router.addRoute({ path: '/user-params', redirect: () => parametersPath(useAuthStore().userData.userId) });
router.addRoute({
  path: '/center/:centerId/grid',
  redirect: (to) => ({ path: '/planning/grid', query: { ...to.query, center: to.params.centerId } }),
});

// L'écran de chargement n'est pas une page publique (layout `loading`) mais s'ouvre sans compte
const LOADING_ROUTE = '/loading';

// Accès : le compte, l'écran de chargement, les pages publiques et celles des administrateurs
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
    if (!initializationStore.isAppReady && to.path !== LOADING_ROUTE) {
      initializationStore.setPendingRoute(to.path);
      return '/loading';
    }

    if (authStore.userData.status === 'pending' && to.path !== '/pending-approval') {
      return '/pending-approval';
    }

    if (isPublicRoute(to)) {
      return '/';
    }

    if (requiresAdmin(to)) {
      if (!authStore.userData.isAdmin) {
        return '/';
      }
    }
  } else {
    if (to.path !== '/login' && !isPublicRoute(to) && to.name !== LOADING_ROUTE) {
      return '/login';
    }
  }
});

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
