<template>
  <!--
    CE QUE C'EST : une boîte pour un décor (des dessins) qui bouge un peu moins vite que la page quand on défile. On met le décor dans la boîte
    (le « slot »), et la boîte se charge de l'effet.

    L'IDÉE : la boîte est plus haute que ce qu'on voit, de `reach` (en % de la hauteur de l'écran). Entre le haut et le bas de la page, elle glisse
    exactement de cette hauteur en plus. Donc : plus la page est longue, plus le glissement est lent ; sur une page très courte, il est à peine
    visible. Tout est fait par le CSS (aucun calcul en JavaScript pendant qu'on défile).

    DEUX FAÇONS DE LA POSER :
    - dans la page (par défaut) : la boîte est un élément comme un autre, que l'on place et dimensionne avec une `class` (le radar du tableau de bord).
      Elle se laisse un peu « retenir » vers le bas pendant le défilement. Le parent doit mettre `overflow: clip` pour que la boîte, décalée,
      n'agrandisse pas la page ;
    - collée à la fenêtre (`fixed`) : une « fenêtre » fixe couvre tout l'écran, et le décor, plus haut qu'elle, glisse derrière vers le haut (la
      page d'accueil).

    Sans navigateur moderne (il doit savoir animer en suivant le défilement), il n'y a pas d'effet : le décor « dans la page » défile comme la
    page, le décor « collé à la fenêtre » reste immobile. Même chose avec « réduire les animations ».

    Le décor est de la décoration pure : caché des lecteurs d'écran (`aria-hidden`) et il ne reçoit jamais de clic.
  -->
  <div v-if="fixed" class="parallax-window" aria-hidden="true">
    <div ref="layer" class="parallax-window__layer" :style="{ '--parallax-reach': `${reach}vh` }">
      <slot />
    </div>
  </div>
  <div v-else ref="layer" class="parallax-flow" :style="{ '--parallax-reach': `${reach}vh` }" aria-hidden="true">
    <slot />
  </div>
</template>

<script setup>
const props = defineProps({
  // De combien le décor glisse entre le haut et le bas de la page, en % de la hauteur de l'écran : 30 = un tiers d'écran
  reach: {
    type: Number,
    default: 70,
  },
  // Collé à la fenêtre au lieu d'être posé dans la page
  fixed: {
    type: Boolean,
    default: false,
  },
});

const layer = ref(null);

// ----- Quand une fenêtre (un dialogue) s'ouvre -----
// Vuetify « fige » alors la page pour qu'on ne puisse plus défiler derrière : il rend la balise `<html>` fixe et la décale vers le haut de ce
// qu'on avait défilé (classe `v-overlay-scroll-blocked`). Pour le navigateur, la page n'a plus de défilement, donc l'animation n'a plus rien à
// suivre et le décor sauterait en haut, derrière la fenêtre. On surveille cette classe : à l'ouverture, on calcule où en était le décor et on le
// pose là, immobile (`data-parallax-frozen`) ; à la fermeture, on le libère et l'animation reprend d'elle-même.
let observer;

const SCROLL_BLOCKED_CLASS = 'v-overlay-scroll-blocked';

const syncWithDialogs = () => {
  const el = layer.value;
  if (!el) return;
  const html = document.documentElement;
  if (!html.classList.contains(SCROLL_BLOCKED_CLASS)) {
    delete el.dataset.parallaxFrozen;
    return;
  }
  // Vuetify garde ce dont la page avait défilé dans `--v-body-scroll-y` (négatif). Le corps de la page, lui, garde sa vraie hauteur.
  const scrolled = -parseFloat(getComputedStyle(html).getPropertyValue('--v-body-scroll-y')) || 0;
  const scrollable = Math.max(document.body.scrollHeight - window.innerHeight, 0);
  const progress = scrollable ? Math.min(scrolled / scrollable, 1) : 0; // 0 = en haut de la page, 1 = tout en bas
  const travel = (props.reach / 100) * window.innerHeight; // la distance totale du glissement, en pixels
  el.style.setProperty('--parallax-frozen', `${(props.fixed ? -1 : 1) * progress * travel}px`);
  el.dataset.parallaxFrozen = '';
};

onMounted(() => {
  observer = new MutationObserver(syncWithDialogs);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  syncWithDialogs();
});

onUnmounted(() => observer?.disconnect());
</script>

<style scoped>
/* ----- Version « dans la page » ----- */
/* La place et la taille viennent de la `class` de celui qui utilise la boîte. Ici : on ne gêne pas les clics. */
.parallax-flow {
  pointer-events: none;
}

/* ----- Version « collée à la fenêtre » ----- */
/* La fenêtre : fixe, plein écran, coupe ce qui dépasse. Quand une fenêtre cache la barre de défilement, Vuetify donne sa largeur dans
   `--v-scrollbar-offset` : on la laisse libre pour que cette fenêtre ne s'élargisse pas (le dessin, mis à l'échelle de sa largeur, bougerait). */
.parallax-window {
  position: fixed;
  inset: 0;
  right: var(--v-scrollbar-offset, 0px);
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Le décor : la hauteur de l'écran (`vh`) plus `reach`. Toujours la même, quoi que fasse la page : le dessin ne change jamais de taille. */
.parallax-window__layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100vh + var(--parallax-reach, 30vh));
}

/* ----- Le mouvement ----- */
/* Les navigateurs modernes savent faire une animation dont l'avancement dépend du défilement de la page (0 en haut, 100 % en bas). On leur dit
   simplement : « va de la position de départ à la position d'arrivée pendant que la page défile », et ils le font tout seuls, hors du code de
   la page, donc de façon très fluide. Les autres ignorent tout ce bloc. Pour qui veut moins de mouvement : pas d'animation. */
@supports (animation-timeline: scroll()) {
  @media (prefers-reduced-motion: no-preference) {
    .parallax-flow {
      animation: parallax-flow linear both;
      animation-timeline: scroll(root block);
      will-change: transform;
    }

    .parallax-window__layer {
      animation: parallax-window linear both;
      animation-timeline: scroll(root block);
      will-change: transform;
    }
  }
}

/* Dans la page : en bas de page, le décor a été repoussé vers le bas de `reach` (donc il a moins monté que la page) */
@keyframes parallax-flow {
  to {
    transform: translate3d(0, var(--parallax-reach, 30vh), 0);
  }
}

/* Collé à la fenêtre : en bas de page, le décor a glissé vers le haut de `reach` */
@keyframes parallax-window {
  to {
    transform: translate3d(0, calc(-1 * var(--parallax-reach, 30vh)), 0);
  }
}

/* ----- Une fenêtre (dialogue) est ouverte ----- */
/* Le script a marqué la boîte `data-parallax-frozen` et donné la position à garder : on arrête l'animation et on pose le décor là, immobile,
   jusqu'à la fermeture. */
.parallax-flow[data-parallax-frozen],
.parallax-window__layer[data-parallax-frozen] {
  animation: none;
  transform: translate3d(0, var(--parallax-frozen, 0px), 0);
}
</style>
