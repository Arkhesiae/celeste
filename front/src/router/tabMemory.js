// Pile de navigation de chaque onglet du bas (`meta.tab` : 'dashboard', 'planning', 'demands', 'center'). Une pile garde les pages visitées dans
// l'onglet, de sa page racine aux sous-pages ouvertes depuis lui (`alternative` : informations, utilisateurs, paramètres...). Elle sert à :
// - rouvrir un onglet là où on l'a laissé (`tabTarget`) ; toucher l'onglet déjà actif ramène à sa page racine ;
// - la flèche de retour des sous-pages (`backTarget`), qui dépile d'une page à la fois ;
// - accorder les piles aux retours et avances du navigateur : revenir sur une page de la pile coupe ce qui la suit.
// En mémoire seulement (voir `resetTabs`, appelé à la déconnexion) ; l'historique du navigateur reste celui du routeur.
import { reactive } from 'vue';

const FALLBACK_PATH = '/dashboard';

const state = reactive({
  current: null, // l'onglet dans lequel on se trouve
  stacks: { dashboard: [], planning: [], demands: [], center: [] },
});

// L'onglet d'une route : la page racine déclare `definePage({ meta: { tab: '<clé>' } })`, ses pages en dépendent
const tabKeyOf = (route) => route.matched.map((record) => record.meta.tab).find(Boolean) ?? null;

// Une sous-page (layout `alternative`) n'est pas une page de l'onglet même quand elle en dépend (`/center/users`)
export const isSubPage = (route) => route.matched.some((record) => record.meta.layout === 'alternative');

const ownerOfTop = (path) => {
  const onTop = (name) => state.stacks[name].at(-1)?.path === path;
  if (state.current && onTop(state.current)) return state.current;
  return Object.keys(state.stacks).find(onTop);
};

// La page racine d'un onglet autre que le tableau de bord : un retour du navigateur ou du téléphone qui en part mène au tableau de bord
export const isTabRoot = (route) => {
  const key = tabKeyOf(route);
  return !!key && !isSubPage(route) && key !== 'dashboard';
};

// À appeler après chaque navigation (`router.afterEach`)
export const trackNavigation = (to) => {
  const key = tabKeyOf(to);

  // Une page de l'onglet : le bas de sa pile
  if (key && !isSubPage(to)) {
    state.current = key;
    state.stacks[key] = [{ path: to.fullPath }];
    return;
  }

  // Une sous-page : sur la pile de son onglet ; sans onglet propre (informations, profil...), sur celle où elle est déjà en haut (on y revient
  // par le bouton de l'onglet), sinon sur celle de l'onglet où l'on est
  const owner = key ?? ownerOfTop(to.fullPath) ?? state.current;
  if (!owner) return;
  state.current = owner;
  const stack = state.stacks[owner];
  const index = stack.findLastIndex((entry) => entry.path === to.fullPath);
  if (index >= 0) stack.length = index + 1;
  else stack.push({ path: to.fullPath, sub: true });
};

// Où mène le bouton d'un onglet : sa dernière page, ou sa page racine (`defaultPath`) si on y est déjà ou qu'il n'a pas de pile
export const tabTarget = (key, defaultPath) => (state.current === key ? defaultPath : (state.stacks[key].at(-1)?.path ?? defaultPath));

// Où mène la flèche de retour : la page précédente de la pile (qu'elle retire). Une sous-page ouverte directement (adresse tapée, rechargement)
// est seule sur sa pile : le tableau de bord.
export const backTarget = () => {
  const stack = state.stacks[state.current];
  if (stack?.length > 1) {
    stack.pop();
    return stack.at(-1).path;
  }
  return FALLBACK_PATH;
};

export const resetTabs = () => {
  state.current = null;
  for (const key of Object.keys(state.stacks)) state.stacks[key] = [];
};
