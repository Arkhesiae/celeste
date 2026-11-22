<template>
  <!-- Anneaux de portée d'un écran radar, centrés sur le coin haut-droit (on n'en voit que le quart), semés de formes arrondies. Les anneaux et
       les emplacements sont figés (dessin généré, voir la rubrique « Line art » de CLAUDE.md) ; la forme de chaque emplacement (cercle ou
       chemin), sa couleur, son contour et sa rotation sont tirés au hasard à chaque ouverture par `utils/artShapes.js`, ou fixés par la
       prop `seed`. Chaque forme apparaît en rebondissant, puis oscille ou palpite très légèrement. -->
  <svg
    viewBox="0 80 900 900"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <g>
      <circle cx="900" cy="0" r="100" opacity="0.8" />
      <circle cx="900" cy="0" r="200" opacity="0.7" />
      <circle cx="900" cy="0" r="300" opacity="0.6" />
      <circle cx="900" cy="0" r="400" opacity="0.5" />
      <circle cx="900" cy="0" r="500" opacity="0.4" />
      <circle cx="900" cy="0" r="600" opacity="0.3" />
      <circle cx="900" cy="0" r="700" opacity="0.2" />
      <circle cx="900" cy="0" r="800" opacity="0.1" />
    </g>

    <!-- position (fixe) > apparition avec rebond > mouvement discret en boucle > la forme -->
    <g v-for="(shape, index) in shapes" :key="index" :transform="`translate(${shape.x} ${shape.y})`">
      <g class="radar-pop" :style="{ '--pop-delay': shape.popDelay }">
        <g
          class="radar-idle"
          :class="`radar-idle--${shape.motion}`"
          :style="[shape.idleStyle, { color: `rgb(var(--v-theme-${shape.tone}))` }]"
          :fill="shape.outlined ? 'none' : 'currentColor'"
          :stroke="shape.outlined ? 'currentColor' : 'none'"
          stroke-width="2"
        >
          <circle v-if="shape.r" :r="shape.r" />
          <path v-else :d="shape.d" />
        </g>
      </g>
    </g>
  </svg>
</template>

<script setup>
import { makeRandom, randomShape } from '@/utils/artShapes.js';

const props = defineProps({
  // Graine du tirage des formes et des mouvements ; sans elle, un tirage différent à chaque ouverture
  seed: {
    type: Number,
    default: undefined,
  },
});

// emplacements figés : [x, y, taille], dans le repère de 900 × 900 du dessin
const SPOTS = [
  [401.1, 322.4, 14],
  [508, 233.5, 7],
  [567.7, 603.2, 14],
  [269.8, 432.4, 26],
  [623.3, 301.9, 7],
  [528.8, 359, 26],
  [730.3, 274.9, 10],
  [796.1, 481.7, 26],
  [759.5, 692.3, 19],
  [297.2, 128.1, 26],
  [464.2, 48.3, 19],
  [680.6, 726.9, 10],
  [206.4, 298.9, 10],
  [398.1, 395.4, 10],
  [801.5, 155.1, 14],
  [309.6, 518.7, 14],
];

const random = props.seed === undefined ? Math.random : makeRandom(props.seed);
const between = (min, max) => min + random() * (max - min);

const shapes = SPOTS.map(([x, y, size], index) => {
  const motion = random() < 0.5 ? 'sway' : 'pulse';
  return {
    x,
    y,
    ...randomShape({ random, size }),
    motion,
    // les formes apparaissent l'une après l'autre, dans un ordre mélangé
    popDelay: `${(random() * 1.1 + index * 0.04).toFixed(2)}s`,
    // mouvement très discret : quelques degrés d'oscillation, ou quelques pour cent de gonflement, chacun à son rythme et à contretemps
    idleStyle: {
      '--idle-duration': `${between(6, 11).toFixed(1)}s`,
      '--idle-delay': `-${between(0, 10).toFixed(1)}s`,
      '--sway-angle': `${between(15, 30).toFixed(1)}deg`,
      '--pulse-scale': between(1.03, 1.2).toFixed(3),
    },
  };
});
</script>

<style scoped>
.radar-pop,
.radar-idle {
  transform-box: fill-box;
  transform-origin: center;
}

/* Apparition : la forme jaillit de rien, dépasse sa taille, rentre un peu puis se pose */
.radar-pop {
  animation: radar-pop 0.9s cubic-bezier(0.34, 1.4, 0.64, 1) var(--pop-delay) both;
}

.radar-idle--sway {
  animation: radar-sway var(--idle-duration) ease-in-out var(--idle-delay) infinite alternate;
}

.radar-idle--pulse {
  animation: radar-pulse var(--idle-duration) ease-in-out var(--idle-delay) infinite;
}

@keyframes radar-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  55% {
    transform: scale(1.18);
    opacity: 1;
  }
  78% {
    transform: scale(0.94);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes radar-sway {
  from {
    transform: rotate(calc(var(--sway-angle) * -1));
  }
  to {
    transform: rotate(var(--sway-angle));
  }
}

@keyframes radar-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(var(--pulse-scale));
  }
}

@media (prefers-reduced-motion: reduce) {
  .radar-pop,
  .radar-idle--sway,
  .radar-idle--pulse {
    animation: none;
  }
}
</style>
