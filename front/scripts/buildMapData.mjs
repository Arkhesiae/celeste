/**
 * Fond de carte du tableau de bord : contours des pays (Natural Earth, domaine public, via le paquet `world-atlas`),
 * allégés pour le navigateur. Génère src/assets/map/countries.json (GeoJSON : contours précis en Europe, grossiers
 * ailleurs, sans l'Antarctique). À relancer seulement pour changer le niveau de détail :
 *
 *   node scripts/buildMapData.mjs
 *
 * `world-atlas` et `topojson-client` ne servent qu'à ce script (dépendances de développement) ; le navigateur ne charge
 * que le fichier généré, comme données du composant de carte.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';

// Détail : 50 m (contours précis) en Europe, où sont les centres ; 110 m (grossier) ailleurs, juste pour situer.
const EUROPE = { west: -32, south: 27, east: 45, north: 72 };
const DETAILED = { quantum: 25, minSpan: 0.3 };     // 0,04° (~4 km) ; les îlots de moins de ~30 km disparaissent
const COARSE = { quantum: 10, minSpan: 0.8 };       // 0,1°

const roundTo = (quantum) => (value) => Math.round(value * quantum) / quantum;

/** Étendue (longitude, latitude) et centre du contour extérieur d'un polygone */
const outerRingBox = (polygon) => {
  const longitudes = polygon[0].map(([longitude]) => longitude);
  const latitudes = polygon[0].map(([, latitude]) => latitude);
  const west = Math.min(...longitudes), east = Math.max(...longitudes), south = Math.min(...latitudes), north = Math.max(...latitudes);
  return { span: Math.max(east - west, north - south), centerLongitude: (west + east) / 2, centerLatitude: (south + north) / 2 };
};
const isInEurope = ({ centerLongitude, centerLatitude }) =>
  centerLongitude >= EUROPE.west && centerLongitude <= EUROPE.east && centerLatitude >= EUROPE.south && centerLatitude <= EUROPE.north;

/** Anneau arrondi, sans points répétés ; null s'il ne reste pas de surface (moins de 4 points) */
const simplifyRing = (ring, round) => {
  const points = [];
  for (const [longitude, latitude] of ring) {
    const point = [round(longitude), round(latitude)];
    const previous = points[points.length - 1];
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) points.push(point);
  }
  return points.length >= 4 ? points : null;
};

const simplifyPolygon = (polygon, round) => {
  const rings = polygon.map((ring) => simplifyRing(ring, round));
  return rings[0] ? rings.filter(Boolean) : null;   // sans contour extérieur, le polygone disparaît
};

const load = (file, object) => {
  const topology = JSON.parse(readFileSync(new URL(`../node_modules/world-atlas/${file}`, import.meta.url)));
  return feature(topology, topology.objects[object]).features;
};
const polygonsOf = (country) => (country.geometry.type === 'Polygon' ? [country.geometry.coordinates] : country.geometry.coordinates);

const detailedCountries = load('countries-50m.json', 'countries');
const coarseCountries = load('countries-110m.json', 'countries');
const coarseByName = new Map(coarseCountries.map((country) => [country.properties.name, country]));

const features = [];
for (const country of detailedCountries) {
  const name = country.properties.name;
  if (name === 'Antarctica') continue;

  const detailed = polygonsOf(country)
    .filter((polygon) => { const box = outerRingBox(polygon); return isInEurope(box) && box.span >= DETAILED.minSpan; })
    .map((polygon) => simplifyPolygon(polygon, roundTo(DETAILED.quantum)));
  const coarse = (coarseByName.has(name) ? polygonsOf(coarseByName.get(name)) : [])
    .filter((polygon) => { const box = outerRingBox(polygon); return !isInEurope(box) && box.span >= COARSE.minSpan; })
    .map((polygon) => simplifyPolygon(polygon, roundTo(COARSE.quantum)));

  const kept = [...detailed, ...coarse].filter(Boolean);
  if (kept.length === 0) continue;
  features.push({ type: 'Feature', properties: { name }, geometry: { type: 'MultiPolygon', coordinates: kept } });
}

const output = new URL('../src/assets/map/countries.json', import.meta.url);
writeFileSync(output, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`${features.length} pays écrits dans src/assets/map/countries.json`);
