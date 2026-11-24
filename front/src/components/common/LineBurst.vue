<template>
  <!-- Enveloppe d'un bouton (ou de tout élément) : au survol ou au clic selon `trigger`, deux ou trois droites se tracent derrière lui, chacune
       dans une direction différente et dépassant du bouton, comme les droites croisées de `ArtLineField`. Avec `fade` (par défaut) elles se
       retirent d'elles-mêmes après `hold` ; sans, elles restent tracées tant que le pointeur (ou le focus) est dessus, ou jusqu'au clic suivant.
       Les droites sont décoratives (`aria-hidden`, sans effet sur les clics) et rien ne bouge avec `prefers-reduced-motion`. Tout se règle par
       les props. -->
  <span
    ref="root"
    class="line-burst"
    :class="{ 'line-burst--drawn': drawn, 'line-burst--block': block }"
    :style="{
      '--line-width': `${strokeWidth}px`,
      '--line-opacity': opacity,
      '--line-duration': `${duration}ms`,
      '--line-easing': easing,
    }"
    @pointerenter="trigger === 'hover' && show()"
    @pointerleave="trigger === 'hover' && hide()"
    @focusin="trigger === 'hover' && show()"
    @focusout="trigger === 'hover' && hide()"
    @click="trigger === 'click' && (fade ? show() : toggle())"
  >
    <span
      v-if="size.width"
      class="line-burst__clip"
      :class="{ 'line-burst__clip--constrain': constrain }"
      :style="constrain ? { borderRadius: clipRadius } : undefined"
    >
      <!-- Le dessin a la taille de l'enveloppe, en pixels (aucune déformation), et les droites dépassent de son cadre -->
      <svg
        class="line-burst__art"
        :viewBox="`0 0 ${size.width} ${size.height}`"
        fill="none"
        stroke-linecap="round"
        aria-hidden="true"
        focusable="false"
      >
        <line
          v-for="(stroke, index) in strokes"
          :key="index"
          class="line-burst__line"
          :x1="stroke.x1"
          :y1="stroke.y1"
          :x2="stroke.x2"
          :y2="stroke.y2"
          pathLength="1"
          :style="{ stroke: `rgb(var(--v-theme-${stroke.tone}))`, '--line-delay': `${index * stagger}ms` }"
        />
      </svg>
    </span>
    <span class="line-burst__content"><slot /></span>
  </span>
</template>

<script setup>
import { SHAPE_TONES, makeRandom } from '@/utils/artShapes.js';

const props = defineProps({
  // Ce qui déclenche le tracé : le survol (ou le focus clavier) ou le clic
  trigger: {
    type: String,
    default: 'hover',
    validator: (value) => ['hover', 'click'].includes(value),
  },
  // Nombre de droites : 2 ou 3 ; sans valeur, deux ou trois selon la graine
  lines: {
    type: Number,
    default: null,
    validator: (value) => value === null || value === 2 || value === 3,
  },
  // Couleurs du thème, reprises tour à tour d'une droite à l'autre
  tones: {
    type: Array,
    default: () => SHAPE_TONES,
  },
  // Épaisseur du trait, en pixels, et opacité (0 à 1)
  strokeWidth: {
    type: Number,
    default: 2 ,
  },
  opacity: {
    type: Number,
    default: 0.7,
  },
  // De combien chaque droite dépasse du cadre de l'élément, en pixels, de chaque côté : cette valeur plus un supplément au hasard jusqu'à la moitié
  extent: {
    type: Number,
    default: 20,
  },
  // Dispersion des droites autour du centre, en fraction de la taille de l'élément (0 : toutes passent par le centre)
  scatter: {
    type: Number,
    default: 0.3,
  },
  // Durée du tracé d'une droite (ms), décalage entre deux droites (ms) et courbe d'accélération CSS
  duration: {
    type: Number,
    default: 500,
  },
  stagger: {
    type: Number,
    default: 90,
  },
  easing: {
    type: String,
    default: 'cubic-bezier(0.22, 0.8, 0.3, 1)',
  },
  // Fin de l'effet : true (par défaut), il s'efface de lui-même ; false, il reste en place jusqu'à ce qu'on le libère (le survol prend fin, ou un
  // nouveau clic en mode clic)
  fade: {
    type: Boolean,
    default: true,
  },
  // Quand l'effet s'efface, le temps pendant lequel les droites restent tracées avant de se retirer, en millisecondes
  hold: {
    type: Number,
    default: 900,
  },
  // Graine du dessin (directions et positions) ; sans elle, un dessin différent pour chaque bouton
  seed: {
    type: Number,
    default: undefined,
  },
  // Prend toute la largeur de son conteneur (une carte dans une grille, par exemple) au lieu de se limiter à son contenu
  block: {
    type: Boolean,
    default: false,
  },
  // Reste dans l'élément : le dessin est découpé à sa taille et à ses coins arrondis (relus sur l'élément du slot), et passe devant lui. Sans cela,
  // il dépasse et passe derrière
  constrain: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const drawn = ref(false);
let holdTimer;

// Taille de l'enveloppe, suivie : les droites sont calculées en pixels pour garder leur angle quelle que soit la forme du bouton
const root = ref(null);
const size = reactive({ width: 0, height: 0 });
let observer;

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    size.width = Math.round(entry.contentRect.width);
    size.height = Math.round(entry.contentRect.height);
  });
  observer.observe(root.value);
  readRadius();
});

// Coins arrondis de l'élément du slot, relus à chaque mesure et au début de l'effet : `constrain` y découpe le dessin
const clipRadius = ref('0');
const readRadius = () => {
  const slotted = root.value?.querySelector(':scope > [class$="__content"]')?.firstElementChild;
  clipRadius.value = slotted ? getComputedStyle(slotted).borderRadius : '0';
};

// Tirée une fois : le dessin ne change pas quand l'élément se redimensionne
const drawingSeed = props.seed ?? Math.floor(Math.random() * 2 ** 31);

// Les directions se répartissent sur le demi-tour (une droite n'a pas de sens) avec un peu de hasard, et chaque droite passe près du centre
const strokes = computed(() => {
  const random = makeRandom(drawingSeed);
  const count = props.lines ?? (random() < 0.5 ? 2 : 3);
  const base = random() * Math.PI;
  return Array.from({ length: count }, (_, index) => {
    const angle = base + (index / count) * Math.PI + (random() - 0.5) * 0.5;
    const cx = size.width / 2 + (random() - 0.5) * size.width * props.scatter;
    const cy = size.height / 2 + (random() - 0.5) * size.height * props.scatter;
    const half = Math.hypot(size.width, size.height) / 2 + props.extent + random() * props.extent * 0.5;
    return {
      x1: +(cx - Math.cos(angle) * half).toFixed(1),
      y1: +(cy - Math.sin(angle) * half).toFixed(1),
      x2: +(cx + Math.cos(angle) * half).toFixed(1),
      y2: +(cy + Math.sin(angle) * half).toFixed(1),
      tone: props.tones[index % props.tones.length],
    };
  });
});

// Qui s'efface : les droites se retirent d'elles-mêmes après `hold`. Qui reste : elles tiennent jusqu'à la fin du survol, ou au clic suivant
const show = () => {
  if (props.disabled) return;
  readRadius();
  clearTimeout(holdTimer);
  drawn.value = true;
  if (props.fade) holdTimer = setTimeout(hide, props.hold);
};

const hide = () => {
  clearTimeout(holdTimer);
  drawn.value = false;
};

const toggle = () => (drawn.value ? hide() : show());

onBeforeUnmount(() => {
  clearTimeout(holdTimer);
  observer?.disconnect();
});
</script>

<style scoped>
.line-burst {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

/* Sur toute la largeur : l'enveloppe et son contenu s'étirent, le contenu (une carte par exemple) remplit la place */
.line-burst--block {
  display: flex;
}

.line-burst--block > .line-burst__content {
  flex: 1;
}

.line-burst--block > .line-burst__content > * {
  flex: 1;
  min-width: 0;
}

/* Le contenu passe devant : les droites se tracent derrière lui */
.line-burst__content {
  position: relative;
  z-index: 1;
  display: inline-flex;
}

/* Le dessin a son propre cadre. Libre, il déborde et passe derrière l'élément ; avec `constrain`, il est découpé à la taille et aux coins arrondis
   de l'élément (le rayon est posé en ligne) et passe devant lui */
.line-burst__clip {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.line-burst__clip--constrain {
  z-index: 2;
  overflow: hidden;
}

/* Exactement l'enveloppe, les droites débordent ; l'élément ne reçoit jamais le pointeur */
.line-burst__art {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

/* Tracé : la droite est un pointillé d'une longueur (`pathLength="1"`) décalé de sa longueur, que l'on ramène à zéro */
.line-burst__line {
  stroke-width: var(--line-width);
  stroke-opacity: var(--line-opacity);
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset var(--line-duration) var(--line-easing);
}

.line-burst--drawn .line-burst__line {
  stroke-dashoffset: 0;
  transition-delay: var(--line-delay);
}

@media (prefers-reduced-motion: reduce) {
  .line-burst__line {
    display: none;
  }
}
</style>
