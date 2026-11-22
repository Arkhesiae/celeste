/**
 * Formes d'ambiance (components/Assets/Art/*) : cercle ou polygone régulier aux coins arrondis, tirés au hasard.
 *
 * Une forme est centrée sur (0, 0) ; `size` est son rayon d'ensemble (le cercle a exactement ce rayon, les polygones un peu plus). Le tirage
 * renvoie soit `r` (un cercle), soit `d` (le tracé d'un chemin SVG), jamais les deux, avec la couleur du thème et le choix plein / contour.
 */

export const SHAPE_KINDS = ['circle', 'triangle', 'square', 'diamond', 'pentagon', 'hexagon'];
export const SHAPE_TONES = ['primary', 'secondary', 'tertiary'];

// tirage par défaut des couleurs : deux chances sur trois pour la couleur primaire, une sur trois pour la secondaire (une couleur répétée pèse plus)
export const RANDOM_TONES = ['primary', 'primary', 'secondary'];

// côtés, rayon du polygone rapporté à `size`, rotation de départ (degrés)
const POLYGONS = {
  triangle: { sides: 3, radius: 1.2, start: 0 },
  square: { sides: 4, radius: 1.3, start: 45 },
  diamond: { sides: 4, radius: 1.3, start: 0 },
  pentagon: { sides: 5, radius: 1.1, start: 0 },
  hexagon: { sides: 6, radius: 1.1, start: 0 },
};

/** Générateur pseudo-aléatoire à graine (mulberry32) : la même graine redonne le même tirage. */
export const makeRandom = (seed) => {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round = (value) => Math.round(value * 100) / 100;

/**
 * Tracé d'un polygone régulier dont chaque sommet est arrondi par un arc de cercle tangent aux deux côtés : un arrondi exact, sans facettes.
 * @param {{ sides: number, radius: number, rotation?: number, fillet: number }} options
 *   `rotation` en degrés (0 : un sommet vers le haut) ; `fillet` : rayon d'arrondi voulu, réduit si les côtés sont trop courts
 * @returns {string} valeur de l'attribut `d`
 */
export const roundedPolygonPath = ({ sides, radius, rotation = 0, fillet }) => {
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = ((rotation + (360 / sides) * i - 90) * Math.PI) / 180;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
  const toward = (from, to) => {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    return { x: (to.x - from.x) / length, y: (to.y - from.y) / length, length };
  };
  return (
    points
      .map((point, i) => {
        const u = toward(point, points[(i + sides - 1) % sides]);
        const v = toward(point, points[(i + 1) % sides]);
        const tan = Math.tan(Math.acos(u.x * v.x + u.y * v.y) / 2); // demi-angle intérieur
        const r = Math.min(fillet, (0.9 * Math.min(u.length, v.length) * tan) / 2); // l'arc tient dans la moitié de chaque côté
        const t = r / tan; // distance du sommet aux points de tangence
        const a = { x: point.x + u.x * t, y: point.y + u.y * t };
        const b = { x: point.x + v.x * t, y: point.y + v.y * t };
        return `${i === 0 ? 'M' : 'L'}${round(a.x)} ${round(a.y)}A${round(r)} ${round(r)} 0 0 1 ${round(b.x)} ${round(b.y)}`;
      })
      .join('') + 'Z'
  );
};

/**
 * Géométrie d'une forme donnée.
 * @param {string} kind - un des `SHAPE_KINDS`
 * @param {{ size?: number, rotation?: number }} [options]
 * @returns {{ r: number, d: null } | { r: null, d: string }} un cercle (`r`) ou un chemin (`d`)
 */
export const shapeGeometry = (kind, { size = 20, rotation = 0 } = {}) => {
  const polygon = POLYGONS[kind];
  if (!polygon) return { r: round(size), d: null };
  return {
    r: null,
    d: roundedPolygonPath({
      sides: polygon.sides,
      radius: size * polygon.radius,
      rotation: polygon.start + rotation,
      fillet: size * 0.4,
    }),
  };
};

/**
 * Tire une forme au hasard.
 * @param {Object} [options]
 * @param {() => number} [options.random=Math.random] - source de hasard dans [0, 1[ (voir `makeRandom` pour une graine)
 * @param {number} [options.size=20] - rayon d'ensemble
 * @param {string[]} [options.kinds=SHAPE_KINDS]
 * @param {string[]} [options.tones=RANDOM_TONES] - couleurs possibles ; une couleur répétée a plus de chances d'être tirée
 * @param {number} [options.outlinedChance=0.4] - probabilité d'une forme contournée plutôt que pleine
 * @returns {{ kind: string, tone: string, outlined: boolean, rotation: number, size: number, r: number|null, d: string|null }}
 */
export const randomShape = ({
  random = Math.random,
  size = 20,
  kinds = SHAPE_KINDS,
  tones = RANDOM_TONES,
  outlinedChance = 0.3,
} = {}) => {
  const kind = kinds[Math.floor(random() * kinds.length)];
  const tone = tones[Math.floor(random() * tones.length)];
  const outlined = random() < outlinedChance;
  const rotation = Math.floor(random() * 360);
  return { kind, tone, outlined, rotation, size, ...shapeGeometry(kind, { size, rotation }) };
};
