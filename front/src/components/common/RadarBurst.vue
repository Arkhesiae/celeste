<template>
  <!-- Enveloppe d'un bouton (ou de tout élément) : au survol ou au clic selon `trigger`, des cercles concentriques d'écran radar, comme les anneaux
       de portée de `ArtRadarField`, apparaissent un à un autour de lui, du plus proche au plus loin. Chaque cercle garde son rayon : il n'y a que
       l'opacité qui bouge. Avec `fade` (par défaut) chaque cercle apparaît (`appear`), reste visible (`hold`) puis s'efface (`vanish`) ; sans, ils restent. Avec `loop`, le survol relance l'onde
       tant que le pointeur (ou le focus) est dessus. Les cercles sont décoratifs (`aria-hidden`, sans effet sur les clics) et rien ne bouge avec
       `prefers-reduced-motion`. Tout se règle par les props. -->
  <span
    ref="root"
    class="radar-burst"
    :class="{ 'radar-burst--stay': !fade, 'radar-burst--block': block }"
    :style="{
      '--radar-width': `${strokeWidth}px`,
      '--radar-opacity': opacity,
      '--radar-appear': `${appear}ms`,
      '--radar-vanish': `${vanish}ms`,
      '--radar-easing': easing,
    }"
    @pointerenter="trigger === 'hover' && start()"
    @pointerleave="trigger === 'hover' && stop()"
    @focusin="trigger === 'hover' && start()"
    @focusout="trigger === 'hover' && stop()"
    @click="trigger === 'click' && (fade ? start() : toggle())"
  >
    <span
      v-if="playing && size.width"
      class="radar-burst__clip"
      :class="{ 'radar-burst__clip--constrain': constrain }"
      :style="constrain ? { borderRadius: clipRadius } : undefined"
    >
      <svg
        :key="runId"
        class="radar-burst__art"
        :class="{ 'radar-burst__art--leaving': leaving }"
        :viewBox="`0 0 ${size.width} ${size.height}`"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          v-for="(ring, index) in circles"
          :key="index"
          class="radar-burst__ring"
          :cx="size.width / 2"
          :cy="size.height / 2"
          :r="ring.radius"
          :style="{
            stroke: `rgb(var(--v-theme-${ring.tone}))`,
            fill: filled ? `rgb(var(--v-theme-${ring.tone}))` : 'none',
            '--radar-delay': `${index * stagger}ms`,
            '--radar-out-delay': `${index * stagger + appear + hold}ms`,
          }"
        />
      </svg>
    </span>
    <span class="radar-burst__content"><slot /></span>
  </span>
</template>

<script setup>
import { SHAPE_TONES } from '@/utils/artShapes.js';

const props = defineProps({
  // Ce qui déclenche l'onde : le survol (ou le focus clavier) ou le clic
  trigger: {
    type: String,
    default: 'hover',
    validator: (value) => ['hover', 'click'].includes(value),
  },
  // Nombre de cercles
  rings: {
    type: Number,
    default: 6,
  },
  // Couleurs du thème, reprises tour à tour d'un cercle à l'autre (une seule couleur : `[ 'primary' ]`)
  tones: {
    type: Array,
    default: () => [SHAPE_TONES[0]],
  },
  // Écart entre deux cercles consécutifs, en pixels : le premier est à cet écart du cercle qui entoure l'élément, le deuxième à deux fois cet
  // écart, etc. Avec `constrain`, ils sont comptés depuis le centre de l'élément
  spacing: {
    type: Number,
    default: 40,
  },
  // Épaisseur du trait (pixels) et opacité d'un cercle (0 à 1) ; avec `filled`, les cercles sont pleins plutôt que contournés
  strokeWidth: {
    type: Number,
    default: 2,
  },
  opacity: {
    type: Number,
    default: 0.6,
  },
  filled: {
    type: Boolean,
    default: false,
  },
  // Vie d'un cercle, en millisecondes : le temps qu'il met à apparaître (`appear`), celui où il reste visible avant de commencer à disparaître
  // (`hold`), puis celui qu'il met à s'effacer (`vanish`). Avec `fade` à false, seul `appear` compte : le cercle reste ensuite
  appear: {
    type: Number,
    default: 180,
  },
  hold: {
    type: Number,
    default: 400,
  },
  vanish: {
    type: Number,
    default: 320,
  },
  // Décalage entre le départ de deux cercles consécutifs (ms) et courbe d'accélération CSS de l'apparition
  stagger: {
    type: Number,
    default: 80,
  },
  easing: {
    type: String,
    default: 'ease-out',
  },
  // Au survol, relance l'onde tant que l'élément est survolé (sans effet en mode clic, ni sans `fade`)
  loop: {
    type: Boolean,
    default: false,
  },
  // Fin de l'effet : true (par défaut), chaque cercle s'efface à son tour ; false, ils restent jusqu'à ce qu'on les libère (le survol prend fin,
  // ou un nouveau clic en mode clic)
  fade: {
    type: Boolean,
    default: true,
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

const playing = ref(false);
const leaving = ref(false);
const runId = ref(0);
let endTimer;
let hovered = false;

// Taille de l'enveloppe, suivie : les cercles sont centrés sur l'élément, quelle que soit sa forme
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

// Coins arrondis de l'élément du slot, relus au début de l'effet : `constrain` y découpe le dessin
const clipRadius = ref('0');
const readRadius = () => {
  const slotted = root.value?.querySelector(':scope > [class$="__content"]')?.firstElementChild;
  clipRadius.value = slotted ? getComputedStyle(slotted).borderRadius : '0';
};

// Les cercles ont chacun leur rayon, espacés de `spacing` : à partir du cercle qui entoure l'élément (ou, avec `constrain`, à partir du centre)
const circles = computed(() => {
  const around = Math.hypot(size.width, size.height) / 2;
  return Array.from({ length: props.rings }, (_, index) => ({
    radius: +((props.constrain ? 0 : around) + props.spacing * (index + 1)).toFixed(1),
    tone: props.tones[index % props.tones.length],
  }));
});

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Durée d'un passage complet : le dernier cercle part `stagger` après l'avant-dernier, et finit de s'effacer
const cycleMs = () => props.stagger * (props.rings - 1) + props.appear + props.hold + props.vanish + 50;

// Qui s'efface : les cercles sont retirés à la fin du passage, ou, avec `loop` et tant que l'élément est survolé, relancés. Qui reste : ils
// attendent `stop`
const scheduleEnd = () => {
  clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    if (props.loop && props.trigger === 'hover' && hovered) {
      runId.value += 1;
      scheduleEnd();
    } else {
      playing.value = false;
    }
  }, cycleMs());
};

const start = () => {
  hovered = true;
  if (props.disabled || reducedMotion() || playing.value) return;
  readRadius();
  runId.value += 1;
  playing.value = true;
  if (props.fade) scheduleEnd();
};

const stop = () => {
  hovered = false;
  if (!props.fade) {
    // Les cercles restés en place s'estompent (0,3 s) puis sont retirés
    if (!playing.value || leaving.value) return;
    leaving.value = true;
    clearTimeout(endTimer);
    endTimer = setTimeout(() => {
      playing.value = false;
      leaving.value = false;
    }, 300);
  }
  // Qui s'efface : le passage en cours va jusqu'au bout, la boucle ne le relance simplement plus
};

const toggle = () => (playing.value ? stop() : start());

onBeforeUnmount(() => {
  clearTimeout(endTimer);
  observer?.disconnect();
});
</script>

<style scoped>
.radar-burst {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

/* Sur toute la largeur : l'enveloppe et son contenu s'étirent, le contenu (une carte par exemple) remplit la place */
.radar-burst--block {
  display: flex;
}

.radar-burst--block > .radar-burst__content {
  flex: 1;
}

.radar-burst--block > .radar-burst__content > * {
  flex: 1;
  min-width: 0;
}

/* Le contenu passe devant : les cercles sont derrière lui */
.radar-burst__content {
  position: relative;
  z-index: 1;
  display: inline-flex;
}

/* Le dessin a son propre cadre. Libre, il déborde et passe derrière l'élément ; avec `constrain`, il est découpé à la taille et aux coins arrondis
   de l'élément (le rayon est posé en ligne) et passe devant lui */
.radar-burst__clip {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.radar-burst__clip--constrain {
  z-index: 2;
  overflow: hidden;
}

/* Exactement l'enveloppe, les cercles débordent ; l'élément ne reçoit jamais le pointeur */
.radar-burst__art {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.radar-burst__art--leaving {
  opacity: 0;
  transition: opacity 0.3s ease;
}

/* Un cercle ne fait qu'apparaître puis s'effacer : son rayon ne bouge pas. Deux animations d'opacité l'une après l'autre : l'apparition (qui
   garde son état), puis la disparition (qui commence après `hold`, d'où son propre délai). Les noms de keyframes d'un style `scoped` sont
   réécrits par Vue : le nom de l'animation se choisit donc ici, jamais par une variable CSS */
.radar-burst__ring {
  stroke-width: var(--radar-width);
  opacity: 0;
  animation:
    radar-burst-in var(--radar-appear) var(--radar-easing) var(--radar-delay) both,
    radar-burst-out var(--radar-vanish) ease-in var(--radar-out-delay) forwards;
}

.radar-burst--stay .radar-burst__ring {
  animation: radar-burst-in var(--radar-appear) var(--radar-easing) var(--radar-delay) both;
}

@keyframes radar-burst-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: var(--radar-opacity);
  }
}

@keyframes radar-burst-out {
  0% {
    opacity: var(--radar-opacity);
  }
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .radar-burst__ring {
    animation: none;
  }
}
</style>
