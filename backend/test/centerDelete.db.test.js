/**
 * Suppression d'un centre : ses tours de service (qui gardent leur centre dans `centerId`), ses équipes (`center`) et ses utilisateurs
 * sont bien touchés, et ceux d'un autre centre ne le sont pas.
 *
 *   node --test backend/test/centerDelete.db.test.js
 *
 * Nécessite un MongoDB local (TEST_CENTER_DELETE_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_center_delete), supprimé à la fin.
 * Sans MongoDB joignable, le test est ignoré.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Rotation from '../models/Rotation.js';
import Team from '../models/Team.js';
import User from '../models/User.js';
import { deleteCenter } from '../controllers/center.controller.js';

const URI = process.env.TEST_CENTER_DELETE_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_center_delete';
let available = false;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_CENTER_DELETE_MONGO_URI doit viser une base de test : ${URI}`);
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

const makeCenter = (name, OACI) => Center.create({ name, OACI, type: 'app', timeZone: 'Europe/Paris' });

test('deleting a center deletes its rotations and teams and detaches its users, and leaves another center alone', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const doomed = await makeCenter('A', 'AAAA');
  const kept = await makeCenter('B', 'BBBB');
  const rotationOfDoomed = await Rotation.create({ name: 'R-A', centerId: doomed._id });
  const rotationOfKept = await Rotation.create({ name: 'R-B', centerId: kept._id });
  const teamOfDoomed = await Team.create({ name: '1', center: doomed._id });
  const teamOfKept = await Team.create({ name: '1', center: kept._id });
  const makeUser = async (centerId, label) =>
    User.create({ name: label, lastName: 'T', email: `${label}@x.fr`, password: await bcrypt.hash('x', 4), registrationStatus: 'verified', centerId });
  const userOfDoomed = await makeUser(doomed._id, 'a');
  const userOfKept = await makeUser(kept._id, 'b');

  let failure;
  await deleteCenter({ params: { id: doomed._id.toString() } }, { json: () => {} }, (error) => (failure = error));
  assert.equal(failure, undefined);

  assert.equal((await Center.findById(doomed._id)).deleted, true);
  assert.equal((await Rotation.findById(rotationOfDoomed._id)).deleted, true, "the center's rotation is deleted (it was matched on the wrong field before)");
  assert.equal((await Team.findById(teamOfDoomed._id)).deleted, true);
  assert.equal((await User.findById(userOfDoomed._id)).centerId, undefined);

  assert.equal((await Rotation.findById(rotationOfKept._id)).deleted, false);
  assert.equal((await Team.findById(teamOfKept._id)).deleted, false);
  assert.equal(String((await User.findById(userOfKept._id)).centerId), String(kept._id));
});
