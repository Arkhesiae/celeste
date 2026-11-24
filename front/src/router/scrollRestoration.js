// Défilement : les quatre onglets du bas (accueil, planning, demandes, centre) retrouvent leur position, tout le reste s'ouvre en haut.
//
// Le plugin expérimental de vue-router n'agit que pour les composants qui appellent `useScrollRestoration()` (il met `history.scrollRestoration`
// à `manual` et il n'y a plus de `scrollBehavior` : une page sans appel garderait le défilement de la précédente). Deux niveaux d'appel :
// - les layouts : le cas général, pour toute page ;
// - la page racine de chaque onglet (dashboard, planning, demand-page/demands, center), qui déclare `definePage({ meta: { tab: true } })` : son
//   appel l'emporte sur celui du layout (même clé, le plus imbriqué gagne) et rétablit la position une fois la page affichée, ce que le layout
//   ne peut pas faire (il agit quand lui-même est mis à jour, la page précédente est encore là et coupe la position à sa hauteur).
// La décision est dans `restore`, selon `meta.tab` : un onglet reprend sa position sauvegardée, toute autre page repart du haut (ou de son ancre `#`).
import { SCROLL_RESTORATION_CAPTURE_DEFAULT, SCROLL_RESTORATION_RESTORE_DEFAULT } from 'vue-router/experimental';

const isMainTab = (route) => route.matched.some((record) => record.meta.tab);

// À passer à `app.use(ScrollRestoration, ...)`, avant le routeur
export const scrollRestorationOptions = (router) => ({
  router,
  capture: SCROLL_RESTORATION_CAPTURE_DEFAULT,
  // Sans position (`null`), la fonction par défaut remonte en haut
  restore: (entry, to) => SCROLL_RESTORATION_RESTORE_DEFAULT(isMainTab(to) ? entry : null, to),
});
