<template>
  <!-- Enveloppe d'un bouton (ou de tout élément) : au survol ou au clic selon `trigger`, quelques formes d'ambiance (`ArtTarget`) jaillissent de
       derrière lui, s'écartent en tournant puis s'estompent. Les formes sont décoratives (`aria-hidden`, sans effet sur les clics) ; le contenu
       en slot n'est ni modifié ni intercepté, l'événement lui reste destiné. Rien ne bouge avec `prefers-reduced-motion`. -->
  <span
    ref="root"
    class="shape-burst"
    :class="{ 'shape-burst--stay': !fade, 'shape-burst--block': block }"
    :style="{ '--burst-easing': easing, '--burst-opacity': opacity }"
    @pointerenter="trigger === 'hover' && burst()"
    @pointerleave="trigger === 'hover' && release()"
    @click="trigger === 'click' && (fade ? burst() : toggle())"
  >
    <span class="shape-burst__layer" :class="{ 'shape-burst__layer--leaving': leaving }" aria-hidden="true">
      <span
        v-for="particle in particles"
        :key="`${burstId}-${particle.id}`"
        class="shape-burst__particle"
        :style="particle.style"
      >
        <ArtTarget
          class="shape-burst__shape"
          :shape="particle.shape"
          :tone="particle.tone"
          :outlined="particle.outlined"
          :rotation="particle.rotation"
        />
      </span>
    </span>
    <span class="shape-burst__content"><slot /></span>
  </span>
</template>

<script setup>
import { SHAPE_KINDS, SHAPE_TONES, randomShape } from '@/utils/artShapes.js';

const props = defineProps({
  // Ce qui déclenche l'éclosion : le survol (la souris, ou le doigt qui touche) ou le clic
  trigger: {
    type: String,
    default: 'hover',
    validator: (value) => ['hover', 'click'].includes(value),
  },
  // Nombre de formes lancées à chaque éclosion
  count: {
    type: Number,
    default: 6,
  },
  // Distance moyenne parcourue au-delà du bord de l'élément, en pixels (les formes sortent de derrière lui, quelle que soit sa taille)
  distance: {
    type: Number,
    default: 20,
  },
  // Taille d'une forme, en pixels (son contour d'ensemble)
  size: {
    type: Number,
    default: 20,
  },
  // Durée du mouvement, en millisecondes, et décalage de départ maximal entre deux formes (tiré au hasard pour chacune)
  duration: {
    type: Number,
    default: 1200,
  },
  stagger: {
    type: Number,
    default: 120,
  },
  // Rotation maximale d'une forme pendant le trajet, en degrés (0 : elles ne tournent pas)
  spin: {
    type: Number,
    default: 270,
  },
  // Dispersion des angles de départ : 0 = régulièrement répartis, 1 = très désordonnés
  scatter: {
    type: Number,
    default: 0.3,
  },
  // Courbe d'accélération CSS du trajet, et opacité maximale (0 à 1)
  easing: {
    type: String,
    default: 'cubic-bezier(0.16, 0.84, 0.3, 1)',
  },
  opacity: {
    type: Number,
    default: 1,
  },
  // Formes contournées (true), pleines (false) ou tirées au hasard (null)
  outlined: {
    type: Boolean,
    default: null,
  },
  // Formes et couleurs du thème tirées au hasard (voir `utils/artShapes.js`)
  shapes: {
    type: Array,
    default: () => SHAPE_KINDS,
  },
  tones: {
    type: Array,
    default: () => SHAPE_TONES,
  },
  // Fin de l'effet : true (par défaut), il s'efface de lui-même ; false, il reste en place jusqu'à ce qu'on le libère (le survol prend fin, ou un
  // nouveau clic en mode clic)
  fade: {
    type: Boolean,
    default: false,
  },
  // Prend toute la largeur de son conteneur (une carte dans une grille, par exemple) au lieu de se limiter à son contenu
  block: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const particles = ref([]);
const burstId = ref(0);
const leaving = ref(false);
let clearTimer;

// Taille de l'enveloppe : le trajet d'une forme commence au bord de l'élément, pas à son centre, sinon un bouton large cacherait celles qui partent de côté
const root = ref(null);

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Les formes partent à intervalle d'angle régulier, un peu décalées au hasard : elles s'écartent sans se chevaucher ni former une rosace trop nette
const makeParticles = () => {
  const offset = Math.random() * Math.PI * 2;
  return Array.from({ length: props.count }, (_, index) => {
    const angle = offset + (index / props.count) * Math.PI * 2 + (Math.random() - 0.5) * 2 * props.scatter;
    const { width, height } = root.value?.getBoundingClientRect() ?? { width: 0, height: 0 };
    const toEdge = Math.min(width / 2 / Math.max(Math.abs(Math.cos(angle)), 1e-3), height / 2 / Math.max(Math.abs(Math.sin(angle)), 1e-3));
    const reach = toEdge + props.distance * (0.7 + Math.random() * 0.6);
    const shape = randomShape({ size: 18, kinds: props.shapes, tones: props.tones });
    return {
      id: index,
      shape: shape.kind,
      tone: shape.tone,
      outlined: props.outlined ?? shape.outlined,
      rotation: shape.rotation,
      style: {
        '--burst-dx': `${(Math.cos(angle) * reach).toFixed(1)}px`,
        '--burst-dy': `${(Math.sin(angle) * reach).toFixed(1)}px`,
        '--burst-turn': `${Math.round((Math.random() < 0.5 ? -1 : 1) * Math.random() * props.spin)}deg`,
        '--burst-delay': `${Math.round(Math.random() * props.stagger)}ms`,
        '--burst-duration': `${Math.round(props.duration * (0.85 + Math.random() * 0.3))}ms`,
        '--burst-size': `${props.size}px`,
      },
    };
  });
};

const burst = () => {
  // Pas de nouvelle éclosion tant que la précédente n'est pas finie : un survol qui sautille ne fait pas de bouillie
  if (props.disabled || particles.value.length || reducedMotion()) return;
  burstId.value += 1;
  particles.value = makeParticles();
  // Qui s'efface : les formes sont retirées une fois parties. Qui reste : elles attendent `release`
  if (props.fade) {
    clearTimer = setTimeout(() => {
      particles.value = [];
    }, props.duration * 1.15 + props.stagger + 100);
  }
};

// Les formes restées en place s'estompent d'un coup (la couche entière, 0,3 s) puis sont retirées
const release = () => {
  if (props.fade || !particles.value.length || leaving.value) return;
  leaving.value = true;
  clearTimer = setTimeout(() => {
    particles.value = [];
    leaving.value = false;
  }, 300);
};

const toggle = () => (particles.value.length ? release() : burst());

onBeforeUnmount(() => clearTimeout(clearTimer));
</script>

<style scoped>
.shape-burst {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
}

/* Sur toute la largeur : l'enveloppe et son contenu s'étirent, le contenu (une carte par exemple) remplit la place */
.shape-burst--block {
  display: flex;
}

.shape-burst--block > .shape-burst__content {
  flex: 1;
}

.shape-burst--block > .shape-burst__content > * {
  flex: 1;
  min-width: 0;
}

/* Le contenu passe devant : les formes jaillissent de derrière lui */
.shape-burst__content {
  position: relative;
  z-index: 1;
  display: inline-flex;
}

/* Couche sans dimension propre, au centre de l'enveloppe, qui ne reçoit jamais le pointeur */
.shape-burst__layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: visible;
}

.shape-burst__layer--leaving {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.shape-burst__particle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--burst-size);
  height: var(--burst-size);
  margin: calc(var(--burst-size) / -2) 0 0 calc(var(--burst-size) / -2);
  opacity: 0;
  animation: shape-burst-fly var(--burst-duration) var(--burst-easing) var(--burst-delay) both;
}

/* Les noms de keyframes d'un style `scoped` sont réécrits par Vue : le nom de l'animation se choisit donc ici, jamais par une variable CSS */
.shape-burst--stay .shape-burst__particle {
  animation-name: shape-burst-settle;
}

.shape-burst__shape {
  display: block;
  width: 100%;
  height: 100%;
}

/* Départ à rien, gonfle très vite, puis file vers sa place en tournant et s'efface */
@keyframes shape-burst-fly {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0) rotate(0);
  }
  18% {
    opacity: var(--burst-opacity);
  }
  100% {
    opacity: 0;
    transform: translate(var(--burst-dx), var(--burst-dy)) scale(0.7) rotate(var(--burst-turn));
  }
}

/* Variante qui reste : même départ, mais les formes s'arrêtent à leur place, visibles */
@keyframes shape-burst-settle {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(0) rotate(0);
  }
  18% {
    opacity: var(--burst-opacity);
  }
  100% {
    opacity: var(--burst-opacity);
    transform: translate(var(--burst-dx), var(--burst-dy)) scale(1) rotate(var(--burst-turn));
  }
}

@media (prefers-reduced-motion: reduce) {
  .shape-burst__particle {
    animation: none;
  }
}
</style>
