/**
 * Lecture des règles (`GET /api/rule?centerId=`) : un jeton est nécessaire, un utilisateur ou un administrateur de centre ne lit que
 * les règles de son centre (et sans les valeurs des autres centres), l'administrateur principal lit celles de n'importe lequel.
 *
 *   node --test backend/test/ruleRead.db.test.js
 *
 * Nécessite un MongoDB local (TEST_RULE_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_rule), supprimé à la fin.
 * Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import Rule from '../models/Rule.js';
import User from '../models/User.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

// Les tests signent des jetons : le secret vient de l'environnement (ici une valeur d'essai si le fichier .env n'est pas chargé)
process.env.JWT_SECRET ??= 'test-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';

const URI = process.env.TEST_RULE_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_rule';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_RULE_MONGO_URI doit viser une base de test : ${URI}`);
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

const makeUser = async (centerId, extra = {}) =>
  User.create({
    name: 'U', lastName: 'V', email: `${new mongoose.Types.ObjectId()}@x.fr`, password: await bcrypt.hash('x', 4),
    registrationStatus: 'verified', centerId, ...extra,
  });

const get = async (path, user) => {
  const headers = {};
  if (user) headers.Authorization = `Bearer ${generateAccessToken({ userId: user._id, isAdmin: !!user.isAdmin, adminType: user.adminType, centerId: user.centerId })}`;
  const response = await fetch(base + path, { headers });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test('rules are read for the caller\'s center only, and only the master sees every center', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const centerA = await Center.create({ name: 'A', OACI: 'AAAA', type: 'app', timeZone: 'Europe/Paris' });
  const centerB = await Center.create({ name: 'B', OACI: 'BBBB', type: 'app', timeZone: 'Europe/Paris' });
  await Rule.create({
    name: 'Points', defaultValue: 10,
    adminValues: [{ centerId: centerA._id, value: 20 }, { centerId: centerB._id, value: 30 }],
  });
  const userA = await makeUser(centerA._id);
  const adminA = await makeUser(centerA._id, { isAdmin: true, adminType: 'local' });
  const master = await makeUser(centerA._id, { isAdmin: true, adminType: 'master' });

  assert.equal((await get(`/rule?centerId=${centerA._id}`)).status, 401, 'no token, no rules');

  // a plain user and a local admin: their own center, with or without naming it, and nobody else's
  for (const caller of [userA, adminA]) {
    const own = await get(`/rule?centerId=${centerA._id}`, caller);
    assert.equal(own.status, 200);
    assert.equal(own.body[0].value, 20, 'the value of their own center');
    assert.equal(own.body[0].adminValues, undefined, 'the values of the other centers are not sent');

    const unnamed = await get('/rule', caller);
    assert.equal(unnamed.status, 200);
    assert.equal(unnamed.body[0].value, 20, 'no center named: their own');

    assert.equal((await get(`/rule?centerId=${centerB._id}`, caller)).status, 403, 'another center is refused');
    assert.equal((await get('/rule?centerId=not-an-id', caller)).status, 400);
  }

  // the master reads any center, and keeps the full rule (the admin page needs `adminValues`)
  const other = await get(`/rule?centerId=${centerB._id}`, master);
  assert.equal(other.status, 200);
  assert.equal(other.body[0].value, 30);
  assert.equal(other.body[0].adminValues.length, 2);
  assert.equal((await get('/rule', master)).body[0].value, 10, 'no center named: the default values');
});
