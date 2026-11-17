/**
 * Compte désactivé et mutation en attente, de bout en bout (vraies routes via HTTP) sur une base jetable.
 *
 *   node --test backend/test/accountStatus.db.test.js
 *
 * Nécessite un MongoDB local (TEST_ACCOUNT_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_account), supprimé à
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
import { generateAccessToken, generateRefreshToken, refreshAccessToken } from '../services/auth/auth.refreshToken.js';

const URI = process.env.TEST_ACCOUNT_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_account';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_ACCOUNT_MONGO_URI doit viser une base de test : ${URI}`);
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

const call = async (method, path, { user, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (user) headers.Authorization = `Bearer ${generateAccessToken({ userId: user._id, isAdmin: user.isAdmin, adminType: user.adminType, centerId: user.centerId })}`;
  const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, code: data.code, data };
};

const makeUsers = async () => {
  const center = await Center.create({ name: 'Test', OACI: 'TEST', type: 'app', timeZone: 'Europe/Paris' });
  const password = await bcrypt.hash('secret-123', 4);
  const mk = (extra) => User.create({
    name: 'A', lastName: 'B', email: `${new mongoose.Types.ObjectId()}@x.fr`, password, centerId: center._id, registrationStatus: 'verified', ...extra,
  });
  return {
    active: await mk({}),
    inactive: await mk({ isActive: false }),
    pending: await mk({ pendingCenterTransfer: { toCenterId: new mongoose.Types.ObjectId(), reason: 'test' } }),
  };
};

test('compte désactivé : refusé à la connexion, au renouvellement du jeton et sur toute route authentifiée', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { active, inactive } = await makeUsers();

  // mauvais mot de passe d'abord : on ne révèle pas l'état du compte
  assert.equal((await call('POST', '/auth/login', { body: { email: inactive.email, password: 'faux' } })).status, 401);
  const login = await call('POST', '/auth/login', { body: { email: inactive.email, password: 'secret-123' } });
  assert.equal(login.status, 403);
  assert.equal(login.code, 'ACCOUNT_INACTIVE');
  assert.equal((await call('POST', '/auth/login', { body: { email: active.email, password: 'secret-123' } })).status, 200);

  const { token, expiresAt } = generateRefreshToken(inactive._id);
  await User.updateOne({ _id: inactive._id }, { $push: { refreshTokens: { token, expiresAt } } });
  await assert.rejects(() => refreshAccessToken(token), (err) => err.status === 403 && err.code === 'ACCOUNT_INACTIVE');

  // jeton encore valide d'un compte désactivé : une lecture comme une écriture est refusée
  const read = await call('GET', `/user/${inactive._id}/points`, { user: inactive });
  assert.equal(read.status, 403);
  assert.equal(read.code, 'ACCOUNT_INACTIVE');
  assert.equal((await call('POST', '/substitution', { user: inactive, body: {} })).code, 'ACCOUNT_INACTIVE');
  assert.equal((await call('GET', `/user/${active._id}/points`, { user: active })).status, 200);
});

test('mutation en attente : connexion et lectures permises, routes qui modifient équipes, points, remplacements et planning refusées', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const { pending } = await makeUsers();

  assert.equal((await call('POST', '/auth/login', { body: { email: pending.email, password: 'secret-123' } })).status, 200);
  assert.equal((await call('GET', `/user/${pending._id}/points`, { user: pending })).status, 200);
  const shifts = await call('POST', `/user/${pending._id}/get-shifts-with-substitutions`, {
    user: pending, body: { dates: { startDate: '2026-01-01', endDate: '2026-01-07' } },
  });
  assert.equal(shifts.status, 200);

  const someId = new mongoose.Types.ObjectId();
  for (const [method, path, body] of [
    ['POST', `/user/${pending._id}/points/transfer`, { receiverId: String(pending._id), amount: 1 }],
    ['POST', `/user/${pending._id}/assign-team`, { teamId: String(someId) }],
    ['POST', '/substitution', {}],
    ['POST', `/substitution/${someId}/accept`, {}],
    ['POST', '/calendar-entry/register-entry', {}],
    ['PUT', `/team/${someId}/name`, { name: 'X' }],
  ]) {
    const result = await call(method, path, { user: pending, body });
    assert.equal(result.status, 403, `${method} ${path}`);
    assert.equal(result.code, 'CENTER_TRANSFER_PENDING', `${method} ${path}`);
  }
});
