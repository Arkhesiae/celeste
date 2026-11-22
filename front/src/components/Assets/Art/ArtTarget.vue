<template>
  <!-- Une forme aux coins arrondis, pleine ou contournée : tout le dessin vient de `utils/artShapes.js`.
       `tone` : la couleur du thème ; `rotation` : en degrés. -->
  <svg
    viewBox="-30 -30 60 60"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    :fill="outlined ? 'none' : 'currentColor'"
    :stroke="outlined ? 'currentColor' : 'none'"
    stroke-width="2"
    :style="{ color: `rgb(var(--v-theme-${tone}))` }"
  >
    <circle v-if="geometry.r" :r="geometry.r" />
    <path v-else :d="geometry.d" />
  </svg>
</template>

<script setup>
import { SHAPE_KINDS, SHAPE_TONES, shapeGeometry } from '@/utils/artShapes.js';

const props = defineProps({
  shape: {
    type: String,
    default: 'circle',
    validator: (value) => SHAPE_KINDS.includes(value),
  },
  tone: {
    type: String,
    default: 'primary',
    validator: (value) => SHAPE_TONES.includes(value),
  },
  // Seulement le contour
  outlined: {
    type: Boolean,
    default: false,
  },
  rotation: {
    type: Number,
    default: 0,
  },
});

// la forme occupe un carré de 60 unités : un rayon d'ensemble de 18 laisse la marge du contour
const geometry = computed(() => shapeGeometry(props.shape, { size: 18, rotation: props.rotation }));
</script>
