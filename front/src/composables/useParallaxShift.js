/**
 * Parallaxe d'un élément posé dans la page : il défile à `speed` de la vitesse de la page (0,3 : il avance de 30 % de la distance dont la page
 * défile, donc reste en retrait derrière le contenu). Le composable pose sur l'élément trois variables CSS, que son style applique (voir
 * `components/common/ParallaxLayer.vue`) :
 *  - `--parallax-shift` : le retard de l'élément sur la page, en pixels vers le bas (`scrollY × (1 - speed)`), pour un élément dans le flux de la
 *    page : `transform: translate3d(0, var(--parallax-shift), 0)` ;
 *  - `--parallax-offset` : son décalage sur une fenêtre fixe, en pixels vers le haut (`-scrollY × speed`), pour un élément épinglé à la fenêtre ;
 *  - `--parallax-height` : la hauteur dont un tel élément a besoin pour couvrir la fenêtre jusqu'en bas de page (`fenêtre + défilement × speed`).
 * Avec « réduire les animations », l'élément défile exactement comme la page (vitesse 1 : aucun retard). Le défilement lu est celui de la fenêtre.
 *
 * @param {import('vue').Ref<HTMLElement|null>} target - l'élément (ou le composant dont `$el` est l'élément)
 * @param {{ speed?: number }} [options]
 */
export function useParallaxShift(target, { speed = 0.3 } = {}) {
  let frame = 0;

  const update = () => {
    frame = 0;
    const element = target.value?.$el ?? target.value;
    if (!element) return;
    const factor = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : speed;
    const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    element.style.setProperty('--parallax-shift', `${window.scrollY * (1 - factor)}px`);
    element.style.setProperty('--parallax-offset', `${-window.scrollY * factor}px`);
    element.style.setProperty('--parallax-height', `${window.innerHeight + scrollable * factor}px`);
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  onMounted(() => {
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (frame) cancelAnimationFrame(frame);
  });
}
