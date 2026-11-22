<template>
  <!-- Anneaux concentriques d'un écran radar, sans rien d'autre. Posé hors du flux dans son parent (qui doit être `position: relative`, avec
       `overflow: hidden` pour couper ce qui dépasse) : le centre est sur `origin`, la taille se règle par `size`.
       À mettre derrière le contenu : `isolation: isolate` sur le parent, le dessin est en `z-index: -1`. -->
  <svg
    class="art radar-rings"
    viewBox="-101 -101 201 201"
    fill="none"
    aria-hidden="true"
    focusable="false"
    :style="style"
  >
    <circle v-for="index in rings" :key="index" :r="(index * 100) / rings" :stroke-opacity="ringOpacity(index)" />
  </svg>
</template>

<script setup>
import { SHAPE_TONES } from '@/utils/artShapes.js';

const props = defineProps({
  // Nombre d'anneaux, régulièrement espacés
  rings: {
    type: Number,
    default: 4,
  },
  // Couleur du thème
  tone: {
    type: String,
    default: 'primary',
    validator: (value) => SHAPE_TONES.includes(value),
  },
  opacity: {
    type: Number,
    default: 0.08,
  },
  // Pourcentage de l'opacité de base que chaque anneau perd de plus que le précédent, du centre vers l'extérieur (0 : tous pareils)
  decreasing: {
    type: Number,
    default: 0,
  },
  // Hauteur du dessin (le diamètre du dernier anneau), en CSS : en % du parent ou en unité de longueur
  size: {
    type: String,
    default: '220%',
  },
  // Où se trouve le centre dans le parent, en CSS (`left` / `top`) : par défaut au milieu du bord droit
  origin: {
    type: Object,
    default: () => ({ x: '100%', y: '50%' }),
  },
});

// le premier anneau garde l'opacité de base, chacun suivant en perd `decreasing` % (jamais moins de 0)
const ringOpacity = (index) => Math.max(0, 1 - ((index - 1) * props.decreasing) / 100);

const style = computed(() => ({
  color: `rgb(var(--v-theme-${props.tone}))`,
  opacity: props.opacity,
  height: props.size,
  left: props.origin.x,
  top: props.origin.y,
}));
</script>

<style scoped>
.radar-rings {
  position: absolute;
  z-index: -1;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
}

.radar-rings circle {
  stroke: currentColor;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
</style>
