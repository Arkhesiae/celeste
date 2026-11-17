/**
 * `GET /rotation/status/:centerId` : les tours de service d'un centre, pour les membres du centre ou le master ; les anciennes
 * lectures de `/rotation` (tous centres, par centre sans contrôle, tour actif cassé) n'existent plus.
 *
 *   node --test backend/test/rotationRead.db.test.js
 *
 * Nécessite un MongoDB local (TEST_ROTATION_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_rotationread), supprimé à
 * la fin. Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import User from '../models/User.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

const URI = process.env.TEST_ROTATION_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_rotationread';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_ROTATION_MONGO_URI doit viser une base de test : ${URI}`);
  try {
    await mongoose.connect(URI, { serverSelectionTimeoutMS: 2500 });
    await mongoose.connection.dropDatabase();
    available = true;
  } catch {
    available = false;
    return;
  }
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  app.use(errorHandler);
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (available) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const call = async (path, user) => {
  const token = generateAccessToken({ userId: user._id, isAdmin: user.isAdmin, adminType: user.adminType, centerId: user.centerId });
  const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
  return response.status;
};

test("les tours de service d'un centre : ses membres et le master, pas un administrateur d'un autre centre", async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const [a, b] = await Promise.all([
    Center.create({ name: 'A', OACI: 'AAAA', type: 'app', timeZone: 'Europe/Paris' }),
    Center.create({ name: 'B', OACI: 'BBBB', type: 'app', timeZone: 'Europe/Paris' }),
  ]);
  const password = await bcrypt.hash('x', 4);
  const mk = (extra) => User.create({
    name: 'U', lastName: 'V', email: `${new mongoose.Types.ObjectId()}@x.fr`, password, registrationStatus: 'verified', ...extra,
  });
  const member = await mk({ centerId: a._id });
  const adminB = await mk({ centerId: b._id, isAdmin: true, adminType: 'local' });
  const master = await mk({ centerId: b._id, isAdmin: true, adminType: 'master' });

  assert.equal(await call(`/rotation/status/${a._id}`, member), 200);
  assert.equal(await call(`/rotation/status/${a._id}`, master), 200);
  assert.equal(await call(`/rotation/status/${a._id}`, adminB), 403);   // l'administrateur d'un autre centre
  assert.equal(await call('/rotation/status/pas-un-id', member), 400);

  // les lectures supprimées n'existent plus (un administrateur : un membre serait refusé avant par isAdmin)
  assert.equal(await call('/rotation', master), 404);
  assert.equal(await call(`/rotation/center/${a._id}`, master), 404);
  assert.equal(await call('/rotation/active-at-date', master), 404);
});

test("les routes d'équipe supprimées n'existent plus", async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const [center] = await Promise.all([Center.create({ name: 'C', OACI: 'CCCC', type: 'app', timeZone: 'Europe/Paris' })]);
  const password = await bcrypt.hash('x', 4);
  const admin = await User.create({
    name: 'U', lastName: 'V', email: `${new mongoose.Types.ObjectId()}@x.fr`, password, registrationStatus: 'verified',
    centerId: center._id, isAdmin: true, adminType: 'local',
  });
  const teamId = new mongoose.Types.ObjectId();
  assert.equal(await call(`/team/${teamId}/get-shifts?dates=2026-01-01`, admin), 404);
});
