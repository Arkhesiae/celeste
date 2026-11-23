// Défilement : les quatre onglets du bas (accueil, planning, demandes, centre) retrouvent leur position, tout le reste s'ouvre en haut.
//
// Le plugin expérimental de vue-router n'agit que pour les composants qui appellent `useScrollRestoration()` (il met `history.scrollRestoration`
// à `manual` et il n'y a plus de `scrollBehavior` : une page sans appel garderait le défilement de la précédente). Deux niveaux d'appel :
// - les layouts : le cas général, pour toute page ;
// - les pages des onglets (dashboard, planning/calendar, planning/grid, demand-page/demands/index, center/centers, center/[centerId]/teams) : leur
//   appel l'emporte sur celui du layout (même clé, le plus imbriqué gagne) et rétablit la position une fois la page affichée, ce que le layout
//   ne peut pas faire (il agit quand lui-même est mis à jour, la page précédente est encore là et coupe la position à sa hauteur).
// La décision par chemin est dans `restore` : un onglet reprend sa position sauvegardée, toute autre page repart du haut (ou de son ancre `#`).
import { SCROLL_RESTORATION_CAPTURE_DEFAULT, SCROLL_RESTORATION_RESTORE_DEFAULT } from 'vue-router/experimental';

const MAIN_TAB_PREFIXES = ['/dashboard', '/planning', '/demand-page', '/center/'];

const isMainTab = (path) => MAIN_TAB_PREFIXES.some((prefix) => path.startsWith(prefix));

// À passer à `app.use(ScrollRestoration, ...)`, avant le routeur
export const scrollRestorationOptions = (router) => ({
  router,
  capture: SCROLL_RESTORATION_CAPTURE_DEFAULT,
  // Sans position (`null`), la fonction par défaut remonte en haut
  restore: (entry, to) => SCROLL_RESTORATION_RESTORE_DEFAULT(isMainTab(to.path) ? entry : null, to),
});
