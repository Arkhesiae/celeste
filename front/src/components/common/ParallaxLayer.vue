<template>
  <!-- Fond en parallaxe : le contenu du slot (du line art en général) défile à `speed` de la vitesse de la page, donc moins vite qu'elle. Deux
       façons de le poser (`fixed`) :
       - dans le flux (par défaut) : la couche est un élément de la page (`class` pour la placer et la dimensionner, comme le radar du tableau de
         bord) ; elle reste en retrait de ce que la page a défilé. Son parent doit la rogner (`overflow: clip`) pour qu'elle n'allonge pas la page ;
       - épinglée (`fixed`) : une fenêtre fixe, toute la largeur et jusque sous la barre du haut, rogne une couche plus haute que la fenêtre qui
         glisse dedans (comme la page d'accueil).
       Le fond est décoratif : `aria-hidden`, aucun clic. Avec « réduire les animations », il défile comme la page. -->
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
  // Part de la vitesse de la page à laquelle le fond défile : 0,3 = 30 %, 1 = comme la page, 0 = immobile
  speed: {
    type: Number,
    default: 0.3,
  },
  // Épinglé à la fenêtre au lieu d'être posé dans le flux de la page
  fixed: {
    type: Boolean,
    default: false,
  },
});

const layer = ref(null);
useParallaxShift(layer, { speed: props.speed });
</script>

<style scoped>
/* Dans le flux : la place et la taille viennent de la classe de l'appelant ; ici seulement le retard sur la page */
.parallax-flow {
  pointer-events: none;
  transform: translate3d(0, var(--parallax-shift, 0px), 0);
  will-change: transform;
}

/* Épinglé : la fenêtre rogne, la couche (assez haute pour couvrir la fenêtre jusqu'en bas de page) glisse vers le haut */
.parallax-window {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.parallax-window__layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--parallax-height, 100vh);
  transform: translate3d(0, var(--parallax-offset, 0px), 0);
  will-change: transform;
}
</style>
