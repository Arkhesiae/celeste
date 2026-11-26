/**
 * Garde-fous des tours de service : un tour actif ou à venir ne se supprime pas ; un tour passé se supprime sans changer le passé ; une
 * date d'activation passée ne se retire pas, et un retrait ne remet pas en vigueur un tour supprimé.
 *
 *   node --test backend/test/rotationGuards.db.test.js
 *
 * Nécessite un MongoDB local en replica set (TEST_ROTATION_GUARDS_MONGO_URI, par défaut
 * mongodb://127.0.0.1:27017/celeste_test_rotation_guards), supprimé à la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Rotation from '../models/Rotation.js';
import { deleteRotation } from '../services/rotation/rotation.delete.js';
import { updateActivationDate, findChangedPeriods } from '../services/rotation/rotation.activation.js';
import { findLatestRotation } from '../services/rotation/rotation.timeline.js';
import { listRotationsWithStatus } from '../services/rotation/rotation.read.js';
import { todayIn } from '../utils/dates/plainDate.js';

const URI = process.env.TEST_ROTATION_GUARDS_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_rotation_guards';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_ROTATION_GUARDS_MONGO_URI doit viser une base de test : ${URI}`);
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

const today = todayIn('Europe/Paris');
const day = (offset) => today.add({ days: offset }).toString();
const make = (centerId, name, days) =>
  Rotation.create({ name, centerId, days: [], activationDays: days, activationDates: days.map((d) => new Date(`${d}T00:00:00Z`)) });
const codeOf = (promise) => promise.then(() => 'accepted', (error) => error.code || error.status);

test('only an active or upcoming rotation cannot be deleted', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await Center.create({ name: 'G', OACI: 'GGGG', type: 'app', timeZone: 'Europe/Paris' });
  const past = await make(center._id, 'past', [day(-60)]);
  const active = await make(center._id, 'active', [day(-10)]);
  const future = await make(center._id, 'future', [day(10)]);
  const unused = await make(center._id, 'unused', []);

  assert.equal(await codeOf(deleteRotation(past._id)), 'accepted');
  assert.equal(await codeOf(deleteRotation(active._id)), 'ActiveRotation');
  assert.equal(await codeOf(deleteRotation(future._id)), 'RemainingOccurences');
  assert.equal(await codeOf(deleteRotation(unused._id)), 'accepted');
});

test('a past activation date cannot be removed, a future one can', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await Center.create({ name: 'H', OACI: 'HHHH', type: 'app', timeZone: 'Europe/Paris' });
  const rotation = await make(center._id, 'r', [day(-10), day(10)]);

  assert.equal(await codeOf(updateActivationDate('remove', rotation._id, day(-10), true)), 'ROTATION_ACTIVATION_DATE_PAST');
  assert.equal(await codeOf(updateActivationDate('remove', rotation._id, day(5), true)), 404);
  assert.equal(await codeOf(updateActivationDate('remove', rotation._id, day(10), true)), 'accepted');
  assert.deepEqual([...(await Rotation.findById(rotation._id)).activationDays], [day(-10)]);
});

test('a deleted rotation keeps its past: planning, timeline, and it never comes back into force', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await Center.create({ name: 'I', OACI: 'IIII', type: 'app', timeZone: 'Europe/Paris' });
  const old = await make(center._id, 'old', [day(-60)]);
  const current = await make(center._id, 'current', [day(0)]);
  await deleteRotation(old._id);

  assert.equal((await findLatestRotation(center._id, day(-30))).name, 'old', 'a past day still belongs to the deleted rotation');
  const { allRotations, sortedRotations } = await listRotationsWithStatus(center._id);
  assert.deepEqual(allRotations.map((r) => r.name), ['current'], 'no card for the deleted rotation');
  assert.deepEqual(sortedRotations.map((r) => [r.name, r.status]), [['old', 'past'], ['current', 'active']]);

  assert.equal(await codeOf(updateActivationDate('remove', current._id, day(0), true)), 'ROTATION_PREVIOUS_DELETED');
});

test('the periods a change affects follow the same rotation rule as the planning, shared days included', () => {
  const at = (rotationId, key) => ({ rotationId, activationDate: new Date(`${key}T00:00:00Z`) });
  const summary = (changes) => changes.map((c) => [c.from.toISOString().slice(0, 10), c.to?.toISOString().slice(0, 10) ?? null, c.oldRule, c.newRule]);

  const before = [at('a', '2030-01-01'), at('b', '2030-03-01')];
  const added = [before[0], at('c', '2030-02-01'), before[1]];
  assert.deepEqual(summary(findChangedPeriods(before, added)), [['2030-02-01', '2030-03-01', 'a', 'c']]);

  // old data, two rotations on one day: the last one is in force, as for the planning
  const shared = [at('a', '2030-01-01'), at('b', '2030-02-01'), at('c', '2030-02-01')];
  const withoutFirst = [shared[0], shared[2]];
  assert.deepEqual(summary(findChangedPeriods(shared, withoutFirst)), [], 'removing the one that was not in force changes nothing');
});
