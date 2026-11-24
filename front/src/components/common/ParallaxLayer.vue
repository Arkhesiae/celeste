<template>
  <!--
    CE QUE C'EST : une boîte pour un décor (des dessins) qui monte plus lentement que la page quand on défile. On met le décor dans la boîte (le
    « slot »), et la boîte se charge du ralentissement.

    DEUX FAÇONS DE LA POSER :
    - dans la page (par défaut) : la boîte est un élément comme un autre, que l'on place et dimensionne avec une `class` (le radar du tableau de bord).
      Le parent doit mettre `overflow: clip` pour que la boîte, un peu décalée, n'agrandisse pas la page ;
    - collée à la fenêtre (`fixed`) : une « fenêtre » fixe couvre tout l'écran, et le décor, plus haut qu'elle, glisse derrière (la page d'accueil).

    Le décor est de la décoration pure : caché des lecteurs d'écran (`aria-hidden`) et il ne reçoit jamais de clic.
  -->
  <div v-if="fixed" class="parallax-window" aria-hidden="true">
    <div ref="layer" class="parallax-window__layer">
      <slot />
    </div>
  </div>
  <div v-else ref="layer" class="parallax-flow" aria-hidden="true">
    <slot />
  </div>
</template>

<script setup>
import { useParallaxShift } from '@/composables/useParallaxShift.js';

const props = defineProps({
  // À quelle vitesse monte le décor, par rapport à la page : 0,3 = 30 % (lent), 1 = comme la page, 0 = il ne bouge pas
  speed: {
    type: Number,
    default: 0.3,
  },
  // Collé à la fenêtre au lieu d'être posé dans la page
  fixed: {
    type: Boolean,
    default: false,
  },
});

// L'élément à ralentir ; `useParallaxShift` calcule les distances et les écrit dessus (voir ce fichier pour le détail)
const layer = ref(null);
useParallaxShift(layer, { speed: props.speed });
</script>

<style scoped>
/* ----- Version « dans la page » ----- */
/* La place et la taille viennent de la `class` de celui qui utilise la boîte. Ici : on ne gêne pas les clics, et on repousse la boîte vers le bas
   (c'est ce qui la fait monter moins vite que la page). */
.parallax-flow {
  pointer-events: none;
  transform: translate3d(0, var(--parallax-shift, 0px), 0);
  will-change: transform; /* prévient le navigateur que ça va bouger : il prépare l'élément pour que ce soit fluide */
}

/* ----- Version « collée à la fenêtre » ----- */
/* La fenêtre : fixe, plein écran, coupe ce qui dépasse. */
.parallax-window {
  position: fixed;
  inset: 0;
  /* Quand une fenêtre cache la barre de défilement, Vuetify donne sa largeur dans `--v-scrollbar-offset` : on la laisse libre pour que la fenêtre ne
     s'élargisse pas (le dessin, mis à l'échelle de sa largeur, bougerait) */
  right: var(--v-scrollbar-offset, 0px);
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Le décor : la hauteur de l'écran (`vh`) plus la distance dont il va monter (`--parallax-extra`, posée par le script), pour ne jamais laisser de
   trou en bas de l'écran ; et il monte doucement. */
.parallax-window__layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: calc(100vh + var(--parallax-extra, 0px));
  transform: translate3d(0, var(--parallax-offset, 0px), 0);
  will-change: transform;
}

/* ----- Navigateurs modernes ----- */
/* Ils savent faire une animation dont l'avancement dépend du défilement (0 en haut de la page, 100 % en bas). On leur dit simplement : « va de
   la position de départ à la position d'arrivée pendant que la page défile », et ils le font tout seuls, de façon très fluide. Les navigateurs
   qui ne comprennent pas cette ligne ignorent tout ce bloc et gardent la version ci-dessus, calculée par le script. */
@supports (animation-timeline: scroll()) {
  .parallax-flow {
    transform: none;
    animation: parallax-flow linear both;
    animation-timeline: scroll(root block);
  }

  .parallax-window__layer {
    transform: none;
    animation: parallax-window linear both;
    animation-timeline: scroll(root block);
  }
}

/* ----- Une fenêtre (dialogue) est ouverte ----- */
/* Vuetify fige la page : plus de défilement, le décor resterait ou sauterait au début. Le script le marque alors `data-parallax-frozen` et
   donne la position à garder : on arrête l'animation et on le pose là, immobile, jusqu'à la fermeture. */
.parallax-flow[data-parallax-frozen] {
  animation: none;
  transform: translate3d(0, var(--parallax-frozen-flow, 0px), 0);
}

.parallax-window__layer[data-parallax-frozen] {
  animation: none;
  transform: translate3d(0, var(--parallax-frozen-window, 0px), 0);
}

/* Les « arrivées » des deux animations : la distance totale calculée par le script (`--parallax-...-travel`) */
@keyframes parallax-flow {
  to {
    transform: translate3d(0, var(--parallax-flow-travel, 0px), 0);
  }
}

@keyframes parallax-window {
  to {
    transform: translate3d(0, var(--parallax-window-travel, 0px), 0);
  }
}
</style>
