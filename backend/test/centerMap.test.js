/**
 * Carte des centres : recherche de la position d'un centre par son nom (center.geocode.js) et comptes de demandes par
 * centre (center.map.js). Le géocodeur est simulé ; la base est une base jetable (TEST_MONGO_URI, nom contenant « test »),
 * les tests qui en ont besoin sont ignorés si elle est injoignable.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Substitution from '../models/Substitution.js';
import { geocodeName, ensureCenterLocations } from '../services/center/center.geocode.js';
import { getCentersMap } from '../services/center/center.map.js';
import { todayIn } from '../utils/dates/plainDate.js';

const URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_center_map';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_MONGO_URI doit viser une base de test : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    available = true;
  } catch {
    available = false;
  }
});

after(async () => {
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

/** Géocodeur simulé : `answers` associe une requête (q) à la liste de résultats renvoyée */
const fakeGeocoder = (answers) => {
  const calls = [];
  const fetchFn = async (url) => {
    const query = new URL(url).searchParams.get('q');
    calls.push(query);
    return { ok: true, status: 200, json: async () => answers[query] ?? [] };
  };
  return { fetchFn, calls };
};

test('Géocodage : le premier résultat donne latitude et longitude (texte du géocodeur converti en nombres)', async () => {
  const { fetchFn, calls } = fakeGeocoder({ Bordeaux: [{ lat: '44.8378', lon: '-0.5792', display_name: 'Bordeaux, France' }] });
  assert.deepEqual(await geocodeName('Bordeaux', { fetchFn }), { latitude: 44.8378, longitude: -0.5792, displayName: 'Bordeaux, France' });
  assert.deepEqual(calls, ['Bordeaux']);
});

test('Géocodage : sans résultat pour le nom, on essaie « aéroport <nom> » ; rien nulle part : null', async () => {
  const airport = fakeGeocoder({ 'aéroport Merignac': [{ lat: '44.83', lon: '-0.71', display_name: 'Aéroport de Bordeaux-Mérignac' }] });
  const found = await geocodeName('Merignac', { fetchFn: airport.fetchFn });
  assert.equal(found.latitude, 44.83);
  assert.deepEqual(airport.calls, ['Merignac', 'aéroport Merignac']);

  const nothing = fakeGeocoder({});
  assert.equal(await geocodeName('Nulle part', { fetchFn: nothing.fetchFn }), null);
  assert.equal(nothing.calls.length, 2);
});

test('Géocodage : une réponse du géocodeur en erreur lève', async () => {
  const fetchFn = async () => ({ ok: false, status: 429, json: async () => [] });
  await assert.rejects(() => geocodeName('Bordeaux', { fetchFn }), /HTTP 429/);
});

const newCenter = (overrides) => Center.create({ type: 'crna', timeZone: 'Europe/Paris', ...overrides });

test('Carte : la position est cherchée par le nom, enregistrée une fois, et un nom introuvable est mémorisé', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const located = await newCenter({ name: 'Bordeaux', OACI: 'MP01' });
  const unknown = await newCenter({ name: 'Introuvable', OACI: 'MP02' });
  const { fetchFn, calls } = fakeGeocoder({ Bordeaux: [{ lat: '44.8', lon: '-0.6', display_name: 'Bordeaux' }] });

  assert.equal(await ensureCenterLocations({ fetchFn, pauseMs: 0 }), 1);
  assert.equal((await Center.findById(located._id)).location.latitude, 44.8);
  assert.ok((await Center.findById(unknown._id)).locationLookupFailedAt);

  // Deuxième passage : plus rien à chercher (le centre localisé l'est, l'introuvable est mémorisé)
  const callsBefore = calls.length;
  assert.equal(await ensureCenterLocations({ fetchFn, pauseMs: 0 }), 0);
  assert.equal(calls.length, callsBefore);
});

test('Carte : comptes de demandes à venir par centre (ouvertes / acceptées), centre de l\'utilisateur signalé', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  await Center.deleteMany({});
  const own = await newCenter({ name: 'Mon centre', OACI: 'MP11', location: { latitude: 48.8, longitude: 2.3 } });
  const other = await newCenter({ name: 'Autre centre', OACI: 'MP12', location: { latitude: 43.6, longitude: 1.4 } });
  await newCenter({ name: 'Sans position', OACI: 'MP13', locationLookupFailedAt: new Date() });

  const today = todayIn('Europe/Paris');
  const demand = (centerId, status, dayOffset) => ({
    centerId, status, deleted: false,
    posterShift: { day: today.add({ days: dayOffset }).toString(), date: new Date(`${today.add({ days: dayOffset }).toString()}T00:00:00Z`) },
  });
  // insertion directe : seuls les champs lus par la carte comptent
  await Substitution.collection.insertMany([
    demand(own._id, 'open', 0), demand(own._id, 'open', 3), demand(own._id, 'accepted', 1),
    demand(own._id, 'open', -2),                      // passée : ignorée
    demand(own._id, 'cancelled', 1),                  // ni ouverte ni acceptée : ignorée
    { ...demand(own._id, 'open', 2), deleted: true }, // supprimée : ignorée
    demand(other._id, 'accepted', 0), demand(other._id, 'accepted', 5),
  ]);

  const { centers, pendingLocations } = await getCentersMap(own._id);
  const byName = Object.fromEntries(centers.map((center) => [center.name, center]));
  assert.equal(pendingLocations, 1);
  assert.deepEqual(centers.map((center) => center.name).sort(), ['Autre centre', 'Mon centre']);
  assert.deepEqual([byName['Mon centre'].open, byName['Mon centre'].accepted, byName['Mon centre'].isOwn], [2, 1, true]);
  assert.deepEqual([byName['Autre centre'].open, byName['Autre centre'].accepted, byName['Autre centre'].isOwn], [0, 2, false]);
  assert.equal(byName['Sans position'], undefined);
  assert.equal(typeof byName['Mon centre'].latitude, 'number');
});
