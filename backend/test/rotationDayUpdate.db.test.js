/**
 * Modification d'un jour d'un tour de service jamais active : passage en repos, nettoyage des variantes retirees (sauf celles encore
 * designees), et aucune ecriture sur la variante d'un autre jour.
 *
 *   node --test backend/test/rotationDayUpdate.db.test.js
 *
 * Necessite un MongoDB local (TEST_ROTATION_UPDATE_MONGO_URI, par defaut mongodb://127.0.0.1:27017/celeste_test_rotation_update),
 * supprime a la fin. Sans MongoDB joignable, les tests sont ignores.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Rotation from '../models/Rotation.js';
import Shift from '../models/Shift.js';
import Variation from '../models/Variation.js';
import Demand from '../models/Demand.js';
import { updateDayInRotation } from '../services/rotation/rotation.update.js';

const URI = process.env.TEST_ROTATION_UPDATE_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_rotation_update';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_ROTATION_UPDATE_MONGO_URI doit viser une base de test : ${URI}`);
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

const hours = { startTime: '07:00', endTime: '15:00' };
const variation = (name) => Variation.create({ name, ...hours, points: 1 });

const setup = async () => {
  const [a, b, c] = await Promise.all(['A', 'B', 'C'].map(variation));
  const shift = await Shift.create({ name: 'J1', order: 1, type: 'work', default: { ...hours, points: 1 }, variations: [a._id, b._id, c._id] });
  const rotation = await Rotation.create({ name: 'R', centerId: new mongoose.Types.ObjectId(), days: [shift._id] });
  return { rotation, shift, a, b, c };
};
const day = (shift, extra) => ({ _id: String(shift._id), name: 'J1', order: 1, type: 'work', optional: false, default: { ...hours }, variations: [], ...extra });
const kept = (v, extra = {}) => ({ _id: String(v._id), name: v.name, ...hours, ...extra });

test('a day can become a rest day', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { rotation, shift, a } = await setup();
  await updateDayInRotation(rotation._id, day(shift, { type: 'rest', default: {} }));
  const saved = await Shift.findById(shift._id).lean();
  assert.equal(saved.type, 'rest');
  assert.equal(saved.default.startTime, null);
  assert.equal(saved.default.points, 0);
  assert.deepEqual(saved.variations, []);
  assert.equal(await Variation.findById(a._id), null);
});

test('an activated rotation is only modified once confirmed', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { rotation, shift } = await setup();
  await Rotation.updateOne({ _id: rotation._id }, { activationDays: ['2026-01-01'], activationDates: [new Date('2026-01-01T00:00:00Z')] });
  const change = day(shift, { name: 'J9' });

  const refused = await updateDayInRotation(rotation._id, change);
  assert.equal(refused.needsApproval, true);
  assert.equal((await Shift.findById(shift._id)).name, 'J1', 'nothing written');

  await updateDayInRotation(rotation._id, change, { confirmed: true });
  assert.equal((await Shift.findById(shift._id)).name, 'J9');

  await Rotation.updateOne({ _id: rotation._id }, { deleted: true });
  await assert.rejects(updateDayInRotation(rotation._id, change, { confirmed: true }), { status: 404 });
});

test('removed variations are deleted unless something still points to them', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { rotation, shift, a, b, c } = await setup();
  await Demand.collection.insertOne({ posterShift: { selectedVariation: c._id } });
  await updateDayInRotation(rotation._id, day(shift, { variations: [kept(a)] }));
  assert.deepEqual((await Shift.findById(shift._id)).variations.map(String), [String(a._id)]);
  assert.ok(await Variation.findById(a._id));
  assert.equal(await Variation.findById(b._id), null);
  assert.ok(await Variation.findById(c._id), 'used by a demand: kept');
});

test('another day\'s variation is not rewritten, and an invalid one changes nothing', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { rotation, shift, a } = await setup();
  const foreign = await variation('Z');
  await updateDayInRotation(rotation._id, day(shift, { variations: [kept(foreign, { startTime: '09:00' })] }));
  assert.equal((await Variation.findById(foreign._id)).startTime, '07:00');

  const other = await setup();
  await assert.rejects(updateDayInRotation(other.rotation._id,
    day(other.shift, { variations: [kept(other.a, { startTime: '10:00' }), { name: 'X', startTime: '08:00' }] })), { status: 400 });
  assert.equal((await Variation.findById(other.a._id)).startTime, '07:00');
});
