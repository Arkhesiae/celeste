/**
 * Exploration optionnelle des variantes ambiguës (services/substitution/compatibility/demandVariations.js).
 * `categorize` ne la fait pas ; `categorizeWithVariations` l'ajoute.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { categorize } from '../services/substitution/compatibility/categorizeDemand.js';
import { categorizeWithVariations, exploreVariations } from '../services/substitution/compatibility/demandVariations.js';

const DAY0 = '2026-03-10';
const addDays = (key, n) => new Date(Date.parse(`${key}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const day = (n) => addDays(DAY0, n);

const entry = (date, shift, startTime, endTime, endsNextDay = false) => ({
  shift, team: null, date, startTime, endTime, endsNextDay,
});

const variation = (id, name, startTime, endTime) => ({ _id: id, name, startTime, endTime, endsNextDay: false });

const demandOf = (posterShift, date) => ({
  _id: 'd1',
  posterShift: { ...posterShift, day: date, date: new Date(`${date}T00:00:00Z`) },
  acceptedSwitches: [],
  toObject() { return JSON.parse(JSON.stringify(this)); },
});

const VARIATION_FIELDS = ['compatibleVariations', 'compatibleFetcherVariationsByDate', 'compatiblePairsByFetcherDate', 'potentiallyCompatible'];

// Le fetcher a travaillé la veille 14:00-22:00 : une vacation qui commence avant 09:00 le lendemain enfreint les 11h
const fetcherYesterday = () => entry(day(-1), { _id: 'f1', type: 'work', name: 'F', default: { startTime: '14:00', endTime: '22:00' }, variations: [] }, '14:00', '22:00');

test('Demande à variantes sans choix : seule la variante compatible est retenue, la demande est « potentiellement compatible »', async () => {
  const early = variation('v-early', 'tôt', '07:00', '15:00');
  const late = variation('v-late', 'tard', '09:00', '17:00');
  const shift = { _id: 's1', name: 'M', type: 'work', default: { startTime: '07:00', endTime: '15:00', endsNextDay: false }, variations: [early, late] };
  const demand = demandOf({ shift, selectedVariation: null }, day(0));
  const map = new Map([[day(-1), fetcherYesterday()]]);

  const res = await categorizeWithVariations(demand, map, { explore: true });
  assert.deepEqual(res.compatibleVariations.map((v) => v._id), ['v-late']);
  assert.equal(res.potentiallyCompatible, true);
  assert.ok(res.limit.includes('insufficientRest')); // sans variante choisie, la limite de base utilise les horaires par défaut (07:00)
});

test('categorize seul ne fait pas l\'exploration (champs absents), mêmes limites de base', async () => {
  const early = variation('v-early', 'tôt', '07:00', '15:00');
  const late = variation('v-late', 'tard', '09:00', '17:00');
  const shift = { _id: 's1', name: 'M', type: 'work', default: { startTime: '07:00', endTime: '15:00', endsNextDay: false }, variations: [early, late] };
  const demand = demandOf({ shift, selectedVariation: null }, day(0));
  const map = new Map([[day(-1), fetcherYesterday()]]);

  const base = await categorize(demand, map);
  const full = await categorizeWithVariations(demand, map, { explore: true });
  for (const field of VARIATION_FIELDS) assert.equal(field in base, false, field);
  assert.deepEqual(full.limit, base.limit);
  assert.equal(full.canSwitch, base.canSwitch);
});

test('Demande à une seule variante ou sans variante : rien à explorer', async () => {
  const shift = { _id: 's1', name: 'M', type: 'work', default: { startTime: '07:00', endTime: '15:00', endsNextDay: false }, variations: [] };
  const res = await exploreVariations(demandOf({ shift, selectedVariation: null }, day(0)), new Map([[day(-1), fetcherYesterday()]]));
  assert.deepEqual(res.compatibleVariations, []);
  assert.equal(res.potentiallyCompatible, false); // une seule combinaison : ni réussite partielle ni échec partiel
});

test('Variantes de la vacation du fetcher : listées quand certaines seulement rendent la demande compatible', async () => {
  // Demande fixe 07:00-15:00 (variante choisie). La vacation d'hier du fetcher est ambiguë : défaut 14:00-22:00 (9h de
  // repos : refusé) ou variante 06:00-12:00 (19h : accepté)
  const chosen = variation('v-chosen', 'choisie', '07:00', '15:00');
  const shift = { _id: 's1', name: 'M', type: 'work', default: { startTime: '07:00', endTime: '15:00', endsNextDay: false }, variations: [chosen] };
  const early = variation('v-early', 'matin', '06:00', '12:00');
  const fetcherShift = { _id: 'f2', type: 'work', name: 'F', default: { startTime: '14:00', endTime: '22:00' }, variations: [early, variation('v-x', 'autre', '13:00', '21:00')] };
  const map = new Map([[day(-1), entry(day(-1), fetcherShift, '14:00', '22:00')]]);

  const res = await exploreVariations(demandOf({ shift, selectedVariation: chosen }, day(0)), map);
  assert.equal(res.potentiallyCompatible, true);
  assert.equal(res.compatibleFetcherVariationsByDate.length, 1);
  const [byDate] = res.compatibleFetcherVariationsByDate;
  assert.equal(byDate.date, day(-1));
  assert.deepEqual(byDate.variations.map((v) => v._id), ['v-early']);
});

test('Sans shiftsMap, l\'exploration échoue comme categorize', async () => {
  const shift = { _id: 's1', name: 'M', type: 'work', default: { startTime: '07:00', endTime: '15:00' }, variations: [] };
  await assert.rejects(() => categorizeWithVariations(demandOf({ shift, selectedVariation: null }, day(0)), null, { explore: true }), /Shifts map not found/);
});

// ─── Drapeau d'exploration ──────────────────────────────────────────────────────────────────────────────────────────
const demandWithTwoVariations = () => {
  const early = variation('v-early', 'tôt', '07:00', '15:00');
  const late = variation('v-late', 'tard', '09:00', '17:00');
  const shift = { _id: 's1', name: 'M', type: 'work', default: { startTime: '07:00', endTime: '15:00', endsNextDay: false }, variations: [early, late] };
  return { demand: demandOf({ shift, selectedVariation: null }, day(0)), early, late, map: new Map([[day(-1), fetcherYesterday()]]) };
};

test('Drapeau : sans `explore` (et sans EXPLORE_VARIATIONS), pas d\'exploration, et le résultat le dit', async () => {
  const previous = process.env.EXPLORE_VARIATIONS;
  delete process.env.EXPLORE_VARIATIONS;
  try {
    const { demand, map } = demandWithTwoVariations();
    const res = await categorizeWithVariations(demand, map);
    assert.equal(res.variationsExplored, false);
    assert.deepEqual(res.compatibleVariations, []);
    assert.equal(res.potentiallyCompatible, false);
    assert.ok(res.limit.includes('insufficientRest')); // la compatibilité de base reste calculée
  } finally {
    if (previous !== undefined) process.env.EXPLORE_VARIATIONS = previous;
  }
});

test('Drapeau : EXPLORE_VARIATIONS=true active l\'exploration par défaut, `explore: false` la désactive', async () => {
  const previous = process.env.EXPLORE_VARIATIONS;
  process.env.EXPLORE_VARIATIONS = 'true';
  try {
    const { demand, map } = demandWithTwoVariations();
    const on = await categorizeWithVariations(demand, map);
    assert.equal(on.variationsExplored, true);
    assert.deepEqual(on.compatibleVariations.map((v) => v._id), ['v-late']);
    const off = await categorizeWithVariations(demand, map, { explore: false });
    assert.equal(off.variationsExplored, false);
  } finally {
    if (previous === undefined) delete process.env.EXPLORE_VARIATIONS; else process.env.EXPLORE_VARIATIONS = previous;
  }
});

test('Variante choisie : prise en compte par le calcul de base, sans exploration', async () => {
  const { demand, early, late, map } = demandWithTwoVariations();
  // aucune variante choisie : horaires par défaut (07:00) → 9h de repos après 22:00... refusé
  assert.ok((await categorize(demand, map)).limit.includes('insufficientRest'));
  // variante choisie par le demandeur sur la demande : 09:00 → 11h de repos, accepté
  const chosen = demandOf({ shift: demand.posterShift.shift, selectedVariation: late }, day(0));
  assert.deepEqual((await categorize(chosen, map)).limit, []);
  assert.ok((await categorize(demandOf({ shift: demand.posterShift.shift, selectedVariation: early }, day(0)), map)).limit.includes('insufficientRest'));
});

test('Variante choisie par l\'utilisateur qui consulte : options.selectedVariation prime', async () => {
  const { demand, late, map } = demandWithTwoVariations();
  assert.ok((await categorize(demand, map)).limit.includes('insufficientRest'));
  assert.deepEqual((await categorize(demand, map, { selectedVariation: late })).limit, []);
  // idem à travers categorizeWithVariations (les options sont transmises)
  assert.deepEqual((await categorizeWithVariations(demand, map, { selectedVariation: late })).limit, []);
});
