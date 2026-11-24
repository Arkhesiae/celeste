<template>
  <!-- Une forme d'ambiance (`ArtTarget`) qui sert de pastille à un texte court (1 ou 2 caractères). La forme est décorative (`aria-hidden`) :
       le texte reste du vrai texte. `size` fixe la largeur, la police s'y adapte ; `tone` choisit la couleur du thème. -->
  <span class="shape-badge" :style="{ '--badge-size': size }">
    <ArtTarget
      class="shape-badge__shape"
      :shape="shape"
      :tone="tone"
      :outlined="outlined"
      :rotation="rotation"
      :style="shapeStyle"
    />
    <span class="shape-badge__text" :style="textStyle">
      <slot />
    </span>
  </span>
</template>

<script setup>
import { SHAPE_KINDS, SHAPE_TONES } from '@/utils/artShapes.js';

const props = defineProps({
  shape: {
    type: String,
    default: 'hexagon',
    validator: (value) => SHAPE_KINDS.includes(value),
  },
  // Couleur du thème de la forme (le texte prend la couleur « sur » correspondante)
  tone: {
    type: String,
    default: 'primary',
    validator: (value) => SHAPE_TONES.includes(value),
  },
  // Seulement le contour : le texte prend alors la couleur de la forme
  outlined: {
    type: Boolean,
    default: false,
  },
  // Rotation de la forme en degrés ; le texte reste droit
  rotation: {
    type: Number,
    default: 0,
  },
  // Largeur (et hauteur) de la pastille, toute longueur CSS
  size: {
    type: String,
    default: '40px',
  },
});

// `ArtTarget` ne remplit pas son carré : le rayon d'une forme est de 18 à 23 unités sur 30. On l'agrandit pour qu'elle remplisse la pastille
// (`scale`), on la recentre (`y`, en fraction de la pastille : un triangle a son sommet plus loin du centre que sa base) et on règle la
// taille du texte (`text`, fraction de la largeur) sur l'aire utile de la forme.
const FIT = {
  circle: { scale: 1.6, y: 0, text: 0.4 },
  square: { scale: 1.75, y: 0, text: 0.4 },
  diamond: { scale: 1.25, y: 0, text: 0.34 },
  pentagon: { scale: 1.5, y: 0.01, text: 0.36 },
  hexagon: { scale: 1.45, y: 0, text: 0.36 },
  triangle: { scale: 1.6, y: 0.145, text: 0.3 },
};
const fit = computed(() => FIT[props.shape] ?? FIT.circle);

const shapeStyle = computed(() => ({ transform: `translateY(${fit.value.y * 100}%) scale(${fit.value.scale})` }));
const textStyle = computed(() => ({
  color: textColor.value,
  fontSize: `calc(var(--badge-size) * ${fit.value.text})`,
  // un pourcentage serait celui de la hauteur du texte, pas de la pastille
  transform: fit.value.y ? `translateY(calc(var(--badge-size) * ${fit.value.y}))` : undefined,
}));

// `primary` -> `onPrimary` : les couleurs du thème sont en camelCase (`--v-theme-onPrimary`)
const textColor = computed(() => {
  const role = props.outlined ? props.tone : `on${props.tone[0].toUpperCase()}${props.tone.slice(1)}`;
  return `rgb(var(--v-theme-${role}))`;
});
</script>

<style scoped>
.shape-badge {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: none;
  width: var(--badge-size);
  aspect-ratio: 1;
}

.shape-badge__shape {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.shape-badge__text {
  position: relative;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}
</style>
