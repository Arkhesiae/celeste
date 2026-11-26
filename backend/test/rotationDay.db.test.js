/**
 * Le tour de service « actif » est celui du jour courant du centre (dans son fuseau), pas de l'instant UTC : à 23:30 UTC le
 * 19 novembre il est déjà le 20 à Paris, et une activation au 20 est en cours.
 *
 *   node --test backend/test/rotationDay.db.test.js
 *
 * Nécessite un MongoDB local (TEST_ROTATIONDAY_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_rotationday), supprimé
 * à la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Rotation from '../models/Rotation.js';
import '../models/Shift.js';
import '../models/Variation.js';
import { listRotationsWithStatus } from '../services/rotation/rotation.read.js';
import { findLatestRotation } from '../services/rotation/rotation.timeline.js';
import { getCenterTimeZone } from '../services/center/center.timezone.js';
import { todayIn } from '../utils/dates/plainDate.js';

const URI = process.env.TEST_ROTATIONDAY_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_rotationday';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_ROTATIONDAY_MONGO_URI doit viser une base de test : ${URI}`);
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

const makeCenter = (timeZone) => Center.create({ name: timeZone, OACI: 'TEST', type: 'app', timeZone });
const makeRotation = (centerId, name, days) => Rotation.create({
  name, centerId, days: [],
  activationDays: days, activationDates: days.map((day) => new Date(`${day}T00:00:00Z`)),
});

test("statut des tours de service : le jour courant du centre, pas le jour UTC", async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  // 23:30 UTC le 19 novembre : le 20 à Paris (UTC+1), toujours le 19 à Lisbonne en hiver (UTC)
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-19T23:30:00Z') });

  const paris = await makeCenter('Europe/Paris');
  await makeRotation(paris._id, 'Ancien', ['2026-10-01']);
  await makeRotation(paris._id, 'Nouveau', ['2026-11-20']);
  const lisbon = await makeCenter('Europe/Lisbon');
  await makeRotation(lisbon._id, 'Ancien', ['2026-10-01']);
  await makeRotation(lisbon._id, 'Nouveau', ['2026-11-20']);

  const statusOf = async (center) => {
    const { sortedRotations } = await listRotationsWithStatus(center._id);
    return Object.fromEntries(sortedRotations.map((r) => [r.name, r.status]));
  };
  assert.deepEqual(await statusOf(paris), { Ancien: 'past', Nouveau: 'active' });
  assert.deepEqual(await statusOf(lisbon), { Ancien: 'active', Nouveau: 'toBeActive' });

  // la lecture du tour actif utilise le même jour
  const activeOf = async (center) => (await findLatestRotation(center._id, todayIn(await getCenterTimeZone(center._id)).toString())).name;
  assert.equal(await activeOf(paris), 'Nouveau');
  assert.equal(await activeOf(lisbon), 'Ancien');
});

test('statut des tours de service : la dernière période reste active sans fin, une période passée a une fin', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-19T12:00:00Z') });
  const center = await makeCenter('Europe/Paris');
  await makeRotation(center._id, 'A', ['2026-01-01', '2026-06-01']);
  const { sortedRotations } = await listRotationsWithStatus(center._id);
  assert.deepEqual(sortedRotations.map((r) => r.status), ['past', 'active']);
  assert.equal(sortedRotations[0].endDate.toISOString(), '2026-06-01T00:00:00.000Z');
  assert.ok(Number.isNaN(sortedRotations[1].endDate.getTime()));   // pas de fin : date invalide comme avant (JSON null)
});
