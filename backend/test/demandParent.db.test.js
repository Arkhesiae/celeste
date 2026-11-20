/**
 * Demande liée : `GET /substitution/:id` renvoie une demande avec ses vacations et son `dependsOn` (le front s'en sert pour afficher la
 * demande dont une autre dépend). Le centre est contrôlé : une demande d'un autre centre répond 403, une supprimée 404.
 *
 *   node --test backend/test/demandParent.db.test.js
 *
 * Nécessite un MongoDB local (TEST_PARENT_MONGO_URI, par défaut mongodb://127.0.0.1:27017/celeste_test_parent), supprimé à la fin.
 * Sans MongoDB joignable, les tests sont ignorés.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import Center from '../models/Center.js';
import User from '../models/User.js';
import Substitution from '../models/Substitution.js';
import routes from '../routes/index.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { generateAccessToken } from '../services/auth/auth.refreshToken.js';

const URI = process.env.TEST_PARENT_MONGO_URI || 'mongodb://127.0.0.1:27017/celeste_test_parent';
let available = false;
let server;
let base;

before(async () => {
  if (!/test/i.test(new URL(URI).pathname)) throw new Error(`TEST_PARENT_MONGO_URI doit viser une base de test : ${URI}`);
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

const makeUser = async (centerId) =>
  User.create({
    name: 'U', lastName: 'V', email: `${new mongoose.Types.ObjectId()}@x.fr`, password: await bcrypt.hash('x', 4),
    registrationStatus: 'verified', centerId,
  });

const get = async (user, path) => {
  const token = generateAccessToken({ userId: user._id, isAdmin: false, adminType: null, centerId: user.centerId });
  const response = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test('GET /substitution/:id : la demande liée, avec ses vacations, dans le centre seulement', async (t) => {
  if (!available) return t.skip('MongoDB indisponible');
  const centerA = await Center.create({ name: 'A', OACI: 'AAAA', type: 'app', timeZone: 'Europe/Paris' });
  const centerB = await Center.create({ name: 'B', OACI: 'BBBB', type: 'app', timeZone: 'Europe/Paris' });
  const poster = await makeUser(centerA._id);
  const colleague = await makeUser(centerA._id);
  const stranger = await makeUser(centerB._id);

  const day = '2099-03-10';
  const makeDemand = (extra = {}) =>
    Substitution.create({
      posterId: poster._id, centerId: centerA._id, type: 'substitution', points: 5,
      posterShift: { shift: new mongoose.Types.ObjectId(), teamId: new mongoose.Types.ObjectId(), day, date: new Date(`${day}T00:00:00.000Z`) },
      ...extra,
    });
  const parent = await makeDemand({ status: 'accepted', accepterId: colleague._id });
  const child = await makeDemand({ dependsOn: [parent._id] });

  // la demande enfant porte l'identifiant de sa demande liée, que le front va chercher
  const childRead = await get(colleague, `/substitution/${child._id}`);
  assert.equal(childRead.status, 200);
  assert.deepEqual(childRead.body.dependsOn, [String(parent._id)]);

  const parentRead = await get(colleague, `/substitution/${parent._id}`);
  assert.equal(parentRead.status, 200);
  assert.equal(parentRead.body._id, String(parent._id));
  assert.equal(parentRead.body.status, 'accepted');
  assert.deepEqual(parentRead.body.dependsOn, []);

  // un autre centre n'y a pas accès, une demande supprimée n'existe plus
  assert.equal((await get(stranger, `/substitution/${parent._id}`)).status, 403);
  const removed = await makeDemand({ deleted: true });
  assert.equal((await get(colleague, `/substitution/${removed._id}`)).status, 404);
});
