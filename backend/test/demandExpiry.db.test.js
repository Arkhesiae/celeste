/**
 * Tâche d'expiration des demandes : « passé » se juge au jour du centre de la demande.
 *
 *   node --test backend/test/demandExpiry.db.test.js
 *
 * Nécessite un MongoDB local (TEST_EXPIRY_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_expiry), supprimé à la fin.
 * Sans MongoDB joignable, le test est ignoré.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Demand from '../models/Demand.js';
import { processPastDemands, processAndCompleteDemands } from '../services/demand/demand.expiry.js';

const URI = process.env.TEST_EXPIRY_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_expiry';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_EXPIRY_MONGO_URI doit viser une base de test : ${URI}`);
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

const insert = async (centerId, status, day) => {
  const { insertedId } = await Demand.collection.insertOne({
    centerId, status, deleted: false, posterShift: { day, date: new Date(`${day}T00:00:00Z`) },
  });
  return insertedId;
};
const statusOf = async (id) => (await Demand.collection.findOne({ _id: id })).status;

test("a demand expires when its day is over in its center's time zone", async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  // 23:30 UTC le 19 novembre : le 20 à Paris, encore le 19 à Lisbonne
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-19T23:30:00Z') });
  const paris = await Center.create({ name: 'P', OACI: 'PPPP', type: 'app', timeZone: 'Europe/Paris' });
  const lisbon = await Center.create({ name: 'L', OACI: 'LLLL', type: 'app', timeZone: 'Europe/Lisbon' });

  const parisOpen = await insert(paris._id, 'open', '2026-11-19');
  const parisAccepted = await insert(paris._id, 'accepted', '2026-11-19');
  const parisToday = await insert(paris._id, 'open', '2026-11-20');
  const lisbonOpen = await insert(lisbon._id, 'open', '2026-11-19');
  const lisbonAccepted = await insert(lisbon._id, 'accepted', '2026-11-19');
  const lisbonPast = await insert(lisbon._id, 'open', '2026-11-18');

  assert.equal(await processPastDemands(), 2);
  assert.equal(await processAndCompleteDemands(), 1);

  assert.equal(await statusOf(parisOpen), 'expired');
  assert.equal(await statusOf(parisAccepted), 'completed');
  assert.equal(await statusOf(parisToday), 'open');
  assert.equal(await statusOf(lisbonPast), 'expired');
  assert.equal(await statusOf(lisbonOpen), 'open', 'still today in Lisbon');
  assert.equal(await statusOf(lisbonAccepted), 'accepted', 'still today in Lisbon');
});
