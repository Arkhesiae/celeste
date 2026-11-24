// Gestion de l'historique du navigateur : DÉSACTIVÉE pour l'instant (navigation classique). Pour la rétablir, appeler
// `installHistoryHandling(router)` dans `router/index.js` juste après `createRouter`, avant la garde d'accès.
//
// - Retour (bouton du navigateur ou du téléphone) depuis la page racine d'un onglet : le tableau de bord, qui prend la place de l'entrée de
//   l'historique que le retour allait rouvrir (`replace` : en l'empilant, un retour depuis le tableau de bord rouvrirait l'onglet et on
//   tournerait en rond). Depuis le tableau de bord ou une sous-page, le retour reste celui de l'historique. Tout retour qui n'est pas une avance
//   compte (la direction manque quand l'entrée n'a pas d'état du routeur). Un retour ne rouvre jamais l'écran de chargement.
// - Une page racine d'onglet ou une sous-page ouverte directement (adresse tapée, lien, rechargement d'une session neuve) n'a aucune entrée de
//   l'application sous elle : un retour quitterait l'application sans qu'on puisse l'intercepter. On glisse le tableau de bord dessous
//   (`state.back` : l'entrée précédente de l'historique du routeur, nulle pour la première).
import { isTabRoot, isSubPage } from './tabMemory.js';

export const installHistoryHandling = (router, { loadingPath = '/loading' } = {}) => {
  let poppingBack = false;

  router.options.history.listen((_to, _from, info) => {
    poppingBack = info.type === 'pop' && info.direction !== 'forward';
  });

  router.beforeEach((to, from) => {
    const wentBack = poppingBack;
    poppingBack = false;
    if (wentBack && (isTabRoot(from) || to.path === loadingPath) && to.path !== '/dashboard')
      return { path: '/dashboard', replace: true };
  });

  // Une navigation qui n'a pas eu lieu (`failure`) ne compte pas, et le drapeau du retour ne doit pas survivre à un retour qui n'a pas atteint
  // la garde (même adresse) : il détournerait la navigation suivante.
  router.afterEach((to, _from, failure) => {
    poppingBack = false;
    if (failure) return;
    if (!(isTabRoot(to) || isSubPage(to)) || window.history.state?.back) return;
    router.replace('/dashboard').then(() => router.push(to.fullPath));
  });
};
