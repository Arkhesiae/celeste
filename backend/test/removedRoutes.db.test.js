/**
 * Routes retirées (sans appelant dans le front) : elles répondent 404, et les routes voisines qui restent répondent toujours.
 *
 *   node --test backend/test/removedRoutes.db.test.js
 *
 * Nécessite un MongoDB local (TEST_REMOVED_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_removed), supprimé à la
 * fin. Sans MongoDB joignable, les tests sont ignorés.
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

const URI = process.env.TEST_REMOVED_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_removed';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_REMOVED_MONGO_URI doit viser une base de test : ${URI}`);
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

test('les routes sans appelant n\'existent plus, leurs voisines répondent', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const center = await Center.create({ name: 'A', OACI: 'AAAA', type: 'app', timeZone: 'Europe/Paris' });
  const master = await User.create({
    name: 'U', lastName: 'V', email: `${new mongoose.Types.ObjectId()}@x.fr`, password: await bcrypt.hash('x', 4),
    registrationStatus: 'verified', centerId: center._id, isAdmin: true, adminType: 'master',
  });
  const token = generateAccessToken({ userId: master._id, isAdmin: true, adminType: 'master', centerId: center._id });
  const status = async (method, path) => (await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}` } })).status;
  const id = new mongoose.Types.ObjectId();

  for (const [method, path] of [
    ['GET', `/user/${id}/team-at?date=2026-01-01`],
    ['DELETE', `/announcement/${id}`],
    ['GET', '/stat/users'],
    ['GET', '/stat/centers'],
    ['GET', '/stat/substitutions'],
    ['POST', '/rule/initialize'],
    ['POST', '/rule/reset'],
    ['POST', '/calendar-entry/restore-initial'],
  ]) {
    assert.equal(await status(method, path), 404, `${method} ${path}`);
  }

  // les routes voisines existent toujours
  assert.equal(await status('GET', '/announcement/history'), 200);
  assert.equal(await status('GET', `/user/${master._id}`), 200);
  assert.notEqual(await status('POST', '/calendar-entry/undo-mods'), 404);
  assert.notEqual(await status('PUT', `/rule/some-rule/lock`), 404);
});
