// Dessine le décor des mails (radar de l'en-tête, lignes du pied) en SVG puis en PNG : les clients de messagerie
// (Gmail, Outlook) n'affichent pas le SVG, le PNG est donc ce que les mails référencent. Les deux sont versionnés dans
// `backend/assets/mail/` ; ce script ne sert qu'à les régénérer (`node backend/scripts/buildMailArt.mjs`).
// `sharp` n'est pas déclaré dans package.json (présent via une dépendance transitive) : le script n'est lancé qu'à la main.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'assets', 'mail');
const sharp = createRequire(import.meta.url)('sharp');

// Les formes viennent de l'algorithme du site (`front/src/utils/artShapes.js`, celui du tableau de bord) : même tirage
// (cercle ou polygone aux coins arrondis, plein ou contour), même graine fixe pour un dessin stable. Les anneaux et les
// emplacements reprennent ceux de `ArtRadarField.vue` (anneaux centrés sur le coin haut-droit, un tous les 100 px d'un
// dessin de 900 px, opacité de 0,8 à 0,1), réduits à la taille de l'en-tête ; le pied reprend les droites croisées de
// `ArtLineField.vue`.
const { makeRandom, randomShape } = await import(pathToFileURL(path.join(here, '..', '..', 'front', 'src', 'utils', 'artShapes.js')));

// Couleurs du thème sombre du site (front/src/plugins/vuetify.js)
const BACKGROUND = '#0F1416';
const TONES = { primary: '#b4b3f5', secondary: '#e2ff6e', tertiary: '#C2C4EB' };

// Emplacements [x, y, taille] de `ArtRadarField.vue`, dans son repère de 900 x 900 (anneaux centrés en (900, 0))
const RADAR_SPOTS = [
  [401.1, 322.4, 14], [508, 233.5, 7], [567.7, 603.2, 14], [269.8, 432.4, 26], [623.3, 301.9, 7], [528.8, 359, 26],
  [730.3, 274.9, 10], [796.1, 481.7, 26], [759.5, 692.3, 19], [297.2, 128.1, 26], [464.2, 48.3, 19], [680.6, 726.9, 10],
  [206.4, 298.9, 10], [398.1, 395.4, 10], [801.5, 155.1, 14], [309.6, 518.7, 14],
];

const round = (value) => Math.round(value * 10) / 10;

/** Une forme tirée par l'algorithme du site, posée en (x, y) : pleine ou contournée, dans la couleur du thème tirée */
function shapeSvg({ x, y, tone, outlined, r, d }) {
  const color = TONES[tone];
  const paint = outlined ? `fill="none" stroke="${color}" stroke-width="2"` : `fill="${color}"`;
  return `<g transform="translate(${round(x)} ${round(y)})" ${paint}>${r ? `<circle r="${r}"/>` : `<path d="${d}"/>`}</g>`;
}

const header = (() => {
  const w = 600;
  const h = 190;
  const scale = 0.667; // le dessin du tableau de bord (900 px) ramené à la largeur de l'en-tête
  const offsetY = 40; // le coin du radar (900, 0) devient (600, -27) : on voit un peu plus que le quart de cercle
  const rings = Array.from({ length: 8 }, (_, i) => {
    const opacity = (0.8 - i * 0.1).toFixed(1);
    return `<circle cx="${w}" cy="${round(-offsetY * scale)}" r="${round((i + 1) * 100 * scale)}" fill="none" stroke="${TONES.primary}" stroke-opacity="${(opacity * 0.5).toFixed(2)}" stroke-width="1.2"/>`;
  }).join('');
  const random = makeRandom(3);
  const shapes = RADAR_SPOTS.map(([x, y, size]) => ({ x: x * scale, y: (y - offsetY) * 0.38, // resserrées en hauteur pour que plus d'emplacements tiennent dans la bande de l'en-tête
      ...randomShape({ random, size: size * scale }) }))
    .filter(({ x, y, size }) => x > 260 && y > size && y < h - size)
    .map(shapeSvg)
    .join('');
  return { name: 'header', w, h, body: rings + shapes };
})();

const footer = (() => {
  const w = 600;
  const h = 70;
  const random = makeRandom(23);
  // Droites qui se croisent dans des directions différentes (comme `ArtLineField.vue`) : chacune va d'un point d'un bord du cadre
  // à un point d'un autre bord (haut, droite, bas ou gauche), d'où des angles de toutes sortes, puis est prolongée au-delà
  const pointOnEdge = (edge) => {
    const t = random();
    return [[t * w, 0], [w, t * h], [t * w, h], [0, t * h]][edge];
  };
  const lines = Array.from({ length: 4 }, () => {
    const startEdge = Math.floor(random() * 4);
    const endEdge = (startEdge + 1 + Math.floor(random() * 3)) % 4; // un bord différent
    const [x1, y1] = pointOnEdge(startEdge);
    const [x2, y2] = pointOnEdge(endEdge);
    const extend = 0.3;
    return `M${round(x1 - (x2 - x1) * extend)} ${round(y1 - (y2 - y1) * extend)}L${round(x2 + (x2 - x1) * extend)} ${round(y2 + (y2 - y1) * extend)}`;
  }).join('');
  const kinds = [5, 8, 6, 9, 7, 5];
  const shapes = kinds
    .map((size, i) => ({ x: 60 + (i * (w - 120)) / (kinds.length - 1) + (random() - 0.5) * 40, y: 14 + random() * (h - 28), ...randomShape({ random, size }) }))
    .map(shapeSvg)
    .join('');
  return { name: 'footer', w, h, body: `<path d="${lines}" fill="none" stroke="${TONES.primary}" stroke-opacity="0.3" stroke-width="1.2"/>${shapes}` };
})();

for (const { name, w, h, body } of [header, footer]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${BACKGROUND}"/>${body}</svg>\n`;
  fs.writeFileSync(path.join(outDir, `${name}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 192 }).resize(w * 2, h * 2).png({ compressionLevel: 9 }).toFile(path.join(outDir, `${name}.png`));
  console.log(`${name}.svg / ${name}.png (${w * 2}x${h * 2})`);
}
