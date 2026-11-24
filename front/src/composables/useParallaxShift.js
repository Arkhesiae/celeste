/**
 * L'IDÉE, EN TRÈS SIMPLE
 *
 * Quand on fait défiler une page, tout monte en même temps, à la même vitesse. Pour un joli décor, on veut qu'il monte PLUS LENTEMENT que le
 * reste : c'est la « parallaxe » (comme les arbres au loin qui avancent moins vite que ceux du bord de la route, quand on est en voiture).
 *
 * Ici, `speed` dit à quelle vitesse monte le décor : 0,3 = il monte à 30 % de la vitesse de la page. Pour le ralentir, on le « retient » un
 * peu : à chaque pas de la page, on le repousse vers le bas de ce qu'il a monté en trop.
 *
 * CE QUE FAIT CE FICHIER
 *
 * Il ne dessine rien. Il calcule des distances et les écrit sur l'élément sous forme de « variables CSS » (des étiquettes avec un nombre, comme
 * `--parallax-flow-travel: 320px`) ; c'est le CSS de `components/common/ParallaxLayer.vue` qui s'en sert pour bouger le décor.
 *
 * DEUX MANIÈRES DE SUIVRE LE DÉFILEMENT
 *
 * 1. Le navigateur moderne sait « animer en suivant le défilement » (`animation-timeline: scroll()`). On lui donne juste le point de départ
 *    (0) et le point d'arrivée (la distance totale à parcourir, `...-travel`), et il se débrouille tout seul, très fluidement, sans que notre
 *    code soit rappelé à chaque pas. C'est la manière préférée.
 * 2. Un navigateur plus ancien ne sait pas : alors on écoute le défilement nous-mêmes et, à chaque image, on écrit la position du moment
 *    (`--parallax-shift` / `--parallax-offset`). C'est un peu moins fluide, mais ça marche partout.
 *
 * LA HAUTEUR EN PLUS (`--parallax-extra`)
 *
 * Un décor collé à la fenêtre qui glisse vers le haut laisserait un trou en bas de l'écran s'il n'avait que la hauteur de l'écran. On lui donne
 * donc, en plus, exactement la distance dont il va monter pendant tout le défilement de la page (la « course » : hauteur de la page moins celle
 * de l'écran, fois la vitesse). Ainsi, tout en bas de la page, il couvre encore l'écran jusqu'en bas.
 *
 * QUAND UNE FENÊTRE (DIALOGUE) S'OUVRE
 *
 * Vuetify « fige » alors la page pour qu'on ne puisse plus défiler derrière : il rend la balise `<html>` fixe et la décale vers le haut de ce
 * qu'on avait défilé (classe `v-overlay-scroll-blocked`). Du point de vue du navigateur, la page n'a plus de défilement : `scrollY` vaut 0 et la
 * page a la hauteur de l'écran. Si on continuait à calculer, le décor croirait être revenu en haut de page et sauterait derrière la fenêtre,
 * puis sauterait de nouveau à sa fermeture. On surveille donc cette classe : à l'ouverture, on mémorise où en était le décor et on l'y laisse,
 * immobile (`data-parallax-frozen`), sans rien recalculer ; à la fermeture, on reprend.
 *
 * « RÉDUIRE LES ANIMATIONS »
 *
 * Si la personne a demandé moins de mouvement dans son système, on met la vitesse à 1 : le décor monte exactement comme la page, donc rien ne
 * bouge par rapport à elle.
 *
 * @param {import('vue').Ref<HTMLElement|null>} target - l'élément à ralentir (ou le composant dont `$el` est l'élément)
 * @param {{ speed?: number }} [options] - `speed` : 0 = le décor ne bouge pas, 1 = il bouge comme la page, 0,3 = 30 % de la vitesse de la page
 */

// Classe que Vuetify pose sur `<html>` quand une fenêtre bloque le défilement de la page
const SCROLL_BLOCKED_CLASS = 'v-overlay-scroll-blocked';
const isScrollBlocked = () => document.documentElement.classList.contains(SCROLL_BLOCKED_CLASS);

// Vrai si ce navigateur sait animer en suivant le défilement
const SCROLL_TIMELINE = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()');

export function useParallaxShift(target, { speed = 0.3 } = {}) {
  let frame = 0; // numéro de la prochaine image demandée pour `place` (0 = aucune)
  let measureFrame = 0; // idem pour `measure`
  let scrollable = 0; // de combien la page peut défiler au total (sa hauteur moins celle de la fenêtre)
  let factor = speed; // la vitesse vraiment utilisée (1 si la personne veut moins de mouvement)
  let observer; // celui qui nous prévient quand la page change de taille
  let blockObserver; // celui qui nous prévient quand une fenêtre bloque ou libère le défilement

  // L'élément à bouger. `target` peut être un composant Vue (il a alors un `$el`) ou directement un élément.
  const element = () => target.value?.$el ?? target.value;

  // Seulement pour les anciens navigateurs : écrit où doit être le décor MAINTENANT, d'après le défilement actuel.
  const place = () => {
    frame = 0;
    const el = element();
    if (!el || isScrollBlocked()) return; // page figée : `scrollY` vaut 0, on ne touche à rien
    // Dans le flux de la page : le décor monte avec la page, on le repousse vers le bas de la part qu'il ne doit pas monter.
    el.style.setProperty('--parallax-shift', `${window.scrollY * (1 - factor)}px`);
    // Épinglé à la fenêtre : il ne bouge pas tout seul, on le fait monter de la part qu'il doit monter.
    el.style.setProperty('--parallax-offset', `${-window.scrollY * factor}px`);
  };

  // Le défilement envoie des dizaines d'événements par seconde : on ne recalcule qu'une fois par image affichée, pas plus.
  const placeSoon = () => {
    if (!frame) frame = requestAnimationFrame(place);
  };

  // Mesure la page et écrit les distances totales. À refaire seulement quand la page ou la fenêtre change de taille, pas à chaque défilement.
  const measure = () => {
    const el = element();
    if (!el || isScrollBlocked()) return; // page figée : sa hauteur est celle de l'écran, la mesure serait fausse
    factor = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : speed;
    scrollable = Math.max(document.documentElement.scrollHeight - document.documentElement.clientHeight, 0);
    // Distance totale dont un décor « dans le flux » doit être repoussé vers le bas, du haut au bas de la page
    el.style.setProperty('--parallax-flow-travel', `${scrollable * (1 - factor)}px`);
    // Distance totale dont un décor « épinglé » doit monter, du haut au bas de la page
    el.style.setProperty('--parallax-window-travel', `${-scrollable * factor}px`);
    // Hauteur en plus : la distance dont le décor va monter pendant tout le défilement
    el.style.setProperty('--parallax-extra', `${scrollable * factor}px`);
    if (!SCROLL_TIMELINE) place();
  };

  // Même précaution : plusieurs changements de taille d'affilée ne font qu'une seule mesure par image.
  const measureSoon = () => {
    if (!measureFrame) {
      measureFrame = requestAnimationFrame(() => {
        measureFrame = 0;
        measure();
      });
    }
  };

  // Une fenêtre bloque ou libère le défilement : on fige le décor là où il est, ou on reprend le calcul
  const syncBlocked = () => {
    const el = element();
    if (!el) return;
    if (isScrollBlocked()) {
      // Vuetify mémorise le défilement perdu dans `--v-body-scroll-y` (négatif) : c'est la position du décor à conserver
      const scrolled = -parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--v-body-scroll-y')) || 0;
      el.style.setProperty('--parallax-frozen-flow', `${scrolled * (1 - factor)}px`);
      el.style.setProperty('--parallax-frozen-window', `${-scrolled * factor}px`);
      el.dataset.parallaxFrozen = '';
    } else {
      delete el.dataset.parallaxFrozen;
      measureSoon();
      placeSoon();
    }
  };

  // Quand le composant apparaît à l'écran : on mesure, puis on surveille.
  onMounted(() => {
    measure();
    // La fenêtre change de taille (on tourne le téléphone, on redimensionne)
    window.addEventListener('resize', measureSoon);
    // La page change de taille toute seule (une carte apparaît, des chiffres arrivent) sans que la fenêtre bouge
    observer = new ResizeObserver(measureSoon);
    observer.observe(document.documentElement);
    // Seulement pour les anciens navigateurs : on écoute le défilement nous-mêmes
    if (!SCROLL_TIMELINE) window.addEventListener('scroll', placeSoon, { passive: true });
    blockObserver = new MutationObserver(syncBlocked);
    blockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    syncBlocked();
  });

  // Quand le composant disparaît : on range tout, pour ne pas laisser d'écouteurs qui tournent dans le vide.
  onUnmounted(() => {
    window.removeEventListener('resize', measureSoon);
    window.removeEventListener('scroll', placeSoon);
    observer?.disconnect();
    blockObserver?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    if (measureFrame) cancelAnimationFrame(measureFrame);
  });
}
